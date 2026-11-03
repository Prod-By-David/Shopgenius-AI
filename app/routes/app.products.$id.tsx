import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  FormLayout,
  InlineStack,
  Layout,
  List,
  Page,
  ProgressBar,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { AiError, generateProductContent } from "../services/ai.server";
import { LANGUAGES, TONES, type GeneratedContent } from "../services/ai-core";
import { scoreSeoContent, sanitizeHtml } from "../services/seo";
import { getShopSettings, getShopQuota, recordGeneration, assertQuota, buildAiConfig, QuotaExceededError, safeParseJson, markGenerationApplied, type ShopQuota } from "../services/shop.server";
import { getProduct, updateImageAltTexts, updateProductContent } from "../services/shopify-products.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const id = params.id ?? "";
  const product = await getProduct(admin, id);

  if (!product) {
    throw new Response("Producto no encontrado", { status: 404 });
  }

  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);
  const history = await prisma.generation.findMany({
    where: { shop: session.shop, productId: product.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    product,
    defaults: {
      tone: settings.defaultTone,
      language: settings.defaultLanguage,
      keywords: settings.defaultKeywords ?? "",
      brandVoice: settings.brandVoice ?? "",
    },
    provider: settings.aiProvider,
    quota: serializeQuota(quota),
    history: history.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      applied: item.applied,
      provider: item.provider,
    })),
  };
};

function serializeQuota(quota: ShopQuota) {
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    percent: quota.percent,
    planName: quota.plan.name,
  };
}

type ActionResult =
  | {
      ok: true;
      intent: "generate";
      generationId: string;
      content: GeneratedContent;
      score: number;
      provider: string;
      model: string;
      demo: boolean;
      remaining: number;
      limit: number;
    }
  | {
      ok: true;
      intent: "apply";
      generationId: string;
      warnings: string[];
    }
  | { ok: false; error: string; code?: string };

export const action = async ({ request, params }: ActionFunctionArgs): Promise<ActionResult> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "generate");

  try {
    if (intent === "apply") {
      const generationId = String(formData.get("generationId") ?? "");
      const generation = await prisma.generation.findFirst({
        where: { id: generationId, shop },
      });
      if (!generation) {
        return { ok: false, error: "No se encontró la generación solicitada." };
      }

      const content = safeParseJson<GeneratedContent | null>(generation.outputJson, null);
      if (!content) {
        return { ok: false, error: "El contenido guardado no es válido." };
      }

      const productId = generation.productId ?? params.id ?? "";
      const product = await getProduct(admin, productId);
      if (!product) {
        return { ok: false, error: "El producto ya no existe en Shopify." };
      }

      const warnings: string[] = [];
      const update = await updateProductContent(admin, {
        id: product.id,
        descriptionHtml: content.descriptionHtml,
        seoTitle: content.metaTitle,
        seoDescription: content.metaDescription,
        tags: content.tags,
      });
      if (!update.ok) warnings.push(...update.errors);

      if (content.altTexts.length > 0) {
        const images = product.images
          .slice(0, content.altTexts.length)
          .map((image, index) => ({ id: image.id, alt: content.altTexts[index] ?? image.altText ?? "" }))
          .filter((image) => image.id.startsWith("gid://"));
        if (images.length > 0) {
          const altResult = await updateImageAltTexts(admin, images);
          if (!altResult.ok) {
            warnings.push(
              `No se pudieron actualizar los alt text: ${altResult.errors.join(", ")}`,
            );
          }
        }
      }

      if (update.ok) {
        await markGenerationApplied(shop, generation.id);
      }

      return { ok: true, intent: "apply", generationId: generation.id, warnings };
    }

    const productId = String(formData.get("productId") ?? params.id ?? "");
    const product = await getProduct(admin, productId);
    if (!product) {
      return { ok: false, error: "Producto no encontrado en Shopify." };
    }

    const quota = await assertQuota(shop);

    const tone = String(formData.get("tone") ?? "profesional");
    const language = String(formData.get("language") ?? "es");
    const keywords = String(formData.get("keywords") ?? "")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    const targetAudience = String(formData.get("targetAudience") ?? "").trim();
    const instructions = String(formData.get("instructions") ?? "").trim();
    const settings = await getShopSettings(shop);
    const imageCount = Math.min(product.images.length, 5);

    const result = await generateProductContent(
      {
        id: product.id,
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        price: product.price,
        currentDescription: product.descriptionHtml,
        variants: product.variants.map((variant) => `${variant.title} (${variant.price})`),
        images: product.images,
      },
      {
        tone,
        language,
        keywords,
        targetAudience,
        instructions,
        brandVoice: settings.brandVoice ?? undefined,
        storeDescription: settings.storeDescription ?? undefined,
        imageCount,
      },
      buildAiConfig(settings),
    );

    const score = scoreSeoContent(result.content).score;

    const generation = await recordGeneration({
      shop,
      type: "PRODUCT_DESCRIPTION",
      productId: product.id,
      productTitle: product.title,
      provider: result.provider,
      model: result.model,
      input: { productId: product.id, tone, language, keywords, targetAudience, instructions },
      output: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      shopSettingsId: settings.id,
    });

    return {
      ok: true,
      intent: "generate",
      generationId: generation.id,
      content: result.content,
      score,
      provider: result.provider,
      model: result.model,
      demo: result.demo,
      remaining: Math.max(0, quota.remaining - 1),
      limit: quota.limit,
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    }
    if (error instanceof AiError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("Error generando contenido", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado generando el contenido.",
    };
  }
};

export default function ProductDetailPage() {
  const { product, defaults, quota, provider, history } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionResult>();
  const shopify = useAppBridge();

  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);
  const [keywords, setKeywords] = useState(defaults.keywords);
  const [targetAudience, setTargetAudience] = useState("");
  const [instructions, setInstructions] = useState("");

  const generated = fetcher.data?.ok && fetcher.data.intent === "generate" ? fetcher.data : null;
  const applied = fetcher.data?.ok && fetcher.data.intent === "apply" ? fetcher.data : null;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;

  const isGenerating = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "generate";
  const isApplying = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "apply";

  const score = useMemo(() => {
    if (!generated) return null;
    return scoreSeoContent(generated.content);
  }, [generated]);

  useEffect(() => {
    if (applied) {
      if (applied.warnings.length > 0) {
        shopify.toast.show("Aplicado con avisos: revisa el detalle", { isError: true });
      } else {
        shopify.toast.show("Contenido publicado en Shopify");
      }
    }
  }, [applied, shopify]);

  useEffect(() => {
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [error, shopify]);

  const quotaLeft = generated ? generated.remaining : quota.remaining;
  const quotaLimit = generated ? generated.limit : quota.limit;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, Math.round(((quotaLimit - quotaLeft) / quotaLimit) * 100)) : 100;

  return (
    <Page
      backAction={{ url: "/app/products" }}
      title={product.title}
      subtitle={`${product.productType ?? "Producto"}${product.vendor ? ` · ${product.vendor}` : ""}${product.price ? ` · ${product.price} ${product.currency ?? ""}` : ""}`}
    >
      <TitleBar title="Optimizar producto" />
      <BlockStack gap="400">
        {error?.code === "QUOTA_EXCEEDED" && (
          <Banner
            tone="critical"
            title="Límite de generaciones alcanzado"
            action={{ content: "Ver planes", url: "/app/billing" }}
          >
            <p>{error.error}</p>
          </Banner>
        )}
        {error && error.code !== "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="No se pudo completar la operación">
            <p>{error.error}</p>
          </Banner>
        )}
        {generated?.demo && (
          <Banner tone="info" title="Contenido demo">
            <p>
              No hay proveedor de IA configurado, así que se ha generado contenido
              de ejemplo. Configura tu API key en Ajustes para contenido real.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Generar contenido con IA
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        label="Tono"
                        options={TONES.map((value) => ({ label: value, value }))}
                        value={tone}
                        onChange={setTone}
                      />
                      <Select
                        label="Idioma"
                        options={LANGUAGES.map((item) => ({ label: item.label, value: item.code }))}
                        value={language}
                        onChange={setLanguage}
                      />
                    </FormLayout.Group>
                    <TextField
                      label="Palabras clave objetivo"
                      value={keywords}
                      onChange={setKeywords}
                      autoComplete="off"
                      helpText="Separadas por comas. Ej: mochila impermeable, mochila 25l"
                    />
                    <TextField
                      label="Público objetivo (opcional)"
                      value={targetAudience}
                      onChange={setTargetAudience}
                      autoComplete="off"
                      placeholder="Ej: excursionistas urbanos de 25-40 años"
                    />
                    <TextField
                      label="Instrucciones adicionales (opcional)"
                      value={instructions}
                      onChange={setInstructions}
                      autoComplete="off"
                      multiline={2}
                      placeholder="Ej: destaca la garantía de 2 años y evita mencionar envíos"
                    />
                  </FormLayout>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {quotaLeft} de {quotaLimit} generaciones disponibles · Proveedor: {provider}
                    </Text>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="generate" />
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="tone" value={tone} />
                      <input type="hidden" name="language" value={language} />
                      <input type="hidden" name="keywords" value={keywords} />
                      <input type="hidden" name="targetAudience" value={targetAudience} />
                      <input type="hidden" name="instructions" value={instructions} />
                      <Button variant="primary" submit loading={isGenerating} disabled={quotaLeft <= 0}>
                        {isGenerating ? "Generando…" : "Generar con IA"}
                      </Button>
                    </fetcher.Form>
                  </InlineStack>
                </BlockStack>
              </Card>

              {generated && (
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center" wrap>
                      <Text as="h2" variant="headingMd">
                        Resultado generado
                      </Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={generated.score >= 80 ? "success" : generated.score >= 50 ? "attention" : "critical"}>
                          {`SEO ${generated.score}/100`}
                        </Badge>
                        <Badge>{generated.provider}</Badge>
                      </InlineStack>
                    </InlineStack>

                    {score && (
                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Puntuación del contenido
                        </Text>
                        <ProgressBar progress={score.score} />
                      </BlockStack>
                    )}

                    <Divider />
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Descripción
                      </Text>
                      <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor="border"
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(generated.content.descriptionHtml) }}
                        />
                      </Box>
                      <TextField
                        label="HTML de la descripción"
                        labelHidden
                        value={generated.content.descriptionHtml}
                        readOnly
                        multiline={4}
                        autoComplete="off"
                        helpText="Este es el HTML que se publicará. Puedes copiarlo si quieres editarlo antes."
                      />
                    </BlockStack>

                    <FormLayout.Group>
                      <TextField
                        label={`Meta título (${generated.content.metaTitle.length}/60)`}
                        value={generated.content.metaTitle}
                        readOnly
                        autoComplete="off"
                      />
                      <TextField
                        label={`Meta descripción (${generated.content.metaDescription.length}/160)`}
                        value={generated.content.metaDescription}
                        readOnly
                        autoComplete="off"
                        multiline={2}
                      />
                    </FormLayout.Group>

                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Etiquetas propuestas
                      </Text>
                      <InlineStack gap="150" wrap>
                        {generated.content.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </InlineStack>
                    </BlockStack>

                    {generated.content.altTexts.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">
                          Alt text de imágenes
                        </Text>
                        <List type="bullet">
                          {generated.content.altTexts.map((alt, index) => (
                            <List.Item key={`${alt}-${index}`}>{alt}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}

                    {generated.content.bulletPoints.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">
                          Bullets de venta
                        </Text>
                        <List type="bullet">
                          {generated.content.bulletPoints.map((bullet, index) => (
                            <List.Item key={`${bullet}-${index}`}>{bullet}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}

                    <Divider />
                    <InlineStack align="space-between" blockAlign="center" wrap>
                      <InlineStack gap="200">
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="apply" />
                          <input type="hidden" name="generationId" value={generated.generationId} />
                          <Button variant="primary" submit loading={isApplying}>
                            Aplicar a Shopify
                          </Button>
                        </fetcher.Form>
                        <Button
                          url={`shopify:admin/products/${product.id.split("/").pop()}`}
                          target="_blank"
                          variant="plain"
                        >
                          Ver en Shopify
                        </Button>
                      </InlineStack>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Se actualizan descripción, SEO, etiquetas y alt text.
                      </Text>
                    </InlineStack>

                    {applied && applied.warnings.length > 0 && (
                      <Banner tone="warning" title="Publicado con avisos">
                        <List>
                          {applied.warnings.map((warning) => (
                            <List.Item key={warning}>{warning}</List.Item>
                          ))}
                        </List>
                      </Banner>
                    )}
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Consumo
                  </Text>
                  <ProgressBar progress={quotaPercent} tone={quotaPercent >= 90 ? "critical" : "primary"} />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Plan {quota.planName} · {quotaLeft} restantes
                  </Text>
                  <Button url="/app/billing" variant="plain">
                    Ver planes
                  </Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Imágenes ({product.images.length})
                  </Text>
                  {product.images.slice(0, 4).map((image) => (
                    <InlineStack key={image.id} gap="200" blockAlign="center">
                      <img
                        src={image.url}
                        alt={image.altText ?? product.title}
                        width={44}
                        height={44}
                        style={{ borderRadius: 8, objectFit: "cover" }}
                      />
                      <Text as="span" variant="bodySm" tone={image.altText ? undefined : "subdued"}>
                        {image.altText ?? "Sin alt text"}
                      </Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Historial del producto
                  </Text>
                  {history.length === 0 ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Aún no hay generaciones para este producto.
                    </Text>
                  ) : (
                    history.map((item) => (
                      <InlineStack key={item.id} align="space-between">
                        <Text as="span" variant="bodySm">
                          {new Date(item.createdAt).toLocaleString("es-ES")}
                        </Text>
                        <Badge tone={item.applied ? "success" : undefined}>
                          {item.applied ? "Aplicado" : "Borrador"}
                        </Badge>
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
