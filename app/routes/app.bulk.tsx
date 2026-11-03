import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AiError, generateProductContent } from "../services/ai.server";
import { LANGUAGES, TONES, type GeneratedContent } from "../services/ai-core";
import { scoreSeoContent } from "../services/seo";
import {
  QuotaExceededError,
  assertQuota,
  buildAiConfig,
  getShopQuota,
  getShopSettings,
  recordGeneration,
} from "../services/shop.server";
import {
  getProduct,
  listProducts,
  updateImageAltTexts,
  updateProductContent,
} from "../services/shopify-products.server";

const BATCH_LIMIT_BY_PLAN: Record<string, number> = {
  FREE: 3,
  STARTER: 5,
  PRO: 10,
  SCALE: 20,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);
  const { products } = await listProducts(admin, { first: 50 });

  return {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      productType: product.productType,
      imageCount: product.images.length,
    })),
    quota: {
      remaining: quota.remaining,
      limit: quota.limit,
      planName: quota.plan.name,
      planId: quota.planId,
    },
    defaults: { tone: settings.defaultTone, language: settings.defaultLanguage },
    provider: settings.aiProvider,
    batchLimit: BATCH_LIMIT_BY_PLAN[quota.planId] ?? 3,
  };
};

type BulkResult =
  | {
      ok: true;
      intent: "generate";
      results: Array<{
        productId: string;
        title: string;
        generationId: string;
        score: number;
        tagCount: number;
        altCount: number;
        demo: boolean;
      }>;
      errors: Array<{ title: string; message: string }>;
      remaining: number;
    }
  | {
      ok: true;
      intent: "apply";
      applied: number;
      failed: Array<{ title: string; message: string }>;
    }
  | { ok: false; error: string; code?: string };

export const action = async ({ request }: ActionFunctionArgs): Promise<BulkResult> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "generate");

  try {
    if (intent === "apply") {
      const ids = String(formData.get("generationIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 20);

      let applied = 0;
      const failed: Array<{ title: string; message: string }> = [];

      for (const generationId of ids) {
        const generation = await prisma.generation.findFirst({ where: { id: generationId, shop } });
        if (!generation) continue;
        const content = JSON.parse(generation.outputJson) as GeneratedContent;
        const product = generation.productId ? await getProduct(admin, generation.productId) : null;
        if (!product) {
          failed.push({ title: generation.productTitle ?? "Producto", message: "Producto no encontrado" });
          continue;
        }
        const update = await updateProductContent(admin, {
          id: product.id,
          descriptionHtml: content.descriptionHtml,
          seoTitle: content.metaTitle,
          seoDescription: content.metaDescription,
          tags: content.tags,
        });
        if (!update.ok) {
          failed.push({ title: product.title, message: update.errors.join(", ") });
          continue;
        }
        if (content.altTexts.length > 0) {
          const images = product.images
            .slice(0, content.altTexts.length)
            .map((image, index) => ({ id: image.id, alt: content.altTexts[index] ?? "" }))
            .filter((image) => image.id.startsWith("gid://"));
          if (images.length > 0) await updateImageAltTexts(admin, images);
        }
        await prisma.generation.update({
          where: { id: generation.id },
          data: { applied: true, appliedAt: new Date() },
        });
        applied += 1;
      }

      return { ok: true, intent: "apply", applied, failed };
    }

    const ids = String(formData.get("productIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      return { ok: false, error: "Selecciona al menos un producto." };
    }

    const settings = await getShopSettings(shop);
    const quota = await assertQuota(shop);
    const maxByPlan = BATCH_LIMIT_BY_PLAN[quota.planId] ?? 3;
    const batchSize = Math.min(ids.length, maxByPlan, quota.remaining);

    const tone = String(formData.get("tone") ?? settings.defaultTone);
    const language = String(formData.get("language") ?? settings.defaultLanguage);

    type GeneratedRow = {
      productId: string;
      title: string;
      generationId: string;
      score: number;
      tagCount: number;
      altCount: number;
      demo: boolean;
    };
    const results: GeneratedRow[] = [];
    const errors: Array<{ title: string; message: string }> = [];
    let remaining = quota.remaining;

    for (const id of ids.slice(0, batchSize)) {
      try {
        const product = await getProduct(admin, id);
        if (!product) {
          errors.push({ title: id, message: "Producto no encontrado" });
          continue;
        }
        const aiResult = await generateProductContent(
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
            keywords: product.tags.slice(0, 3),
            brandVoice: settings.brandVoice ?? undefined,
            storeDescription: settings.storeDescription ?? undefined,
            imageCount: Math.min(product.images.length, 5),
          },
          buildAiConfig(settings),
        );

        const generation = await recordGeneration({
          shop,
          type: "PRODUCT_DESCRIPTION",
          productId: product.id,
          productTitle: product.title,
          provider: aiResult.provider,
          model: aiResult.model,
          input: { productId: product.id, tone, language },
          output: aiResult.content,
          tokensIn: aiResult.tokensIn,
          tokensOut: aiResult.tokensOut,
          shopSettingsId: settings.id,
        });

        results.push({
          productId: product.id,
          title: product.title,
          generationId: generation.id,
          score: scoreSeoContent(aiResult.content).score,
          tagCount: aiResult.content.tags.length,
          altCount: aiResult.content.altTexts.length,
          demo: aiResult.demo,
        });
        remaining = Math.max(0, remaining - 1);
      } catch (error) {
        errors.push({
          title: id,
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return { ok: true, intent: "generate", results, errors, remaining };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    }
    if (error instanceof AiError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("Error en generación masiva", error);
    return { ok: false, error: "No se pudo completar la generación masiva." };
  }
};

export default function BulkPage() {
  const { products, quota, defaults, provider, batchLimit } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<BulkResult>();
  const shopify = useAppBridge();
  const [selected, setSelected] = useState<string[]>([]);
  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);

  const generating =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "generate";
  const applyingState =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "apply";

  const generated = fetcher.data?.ok && fetcher.data.intent === "generate" ? fetcher.data : null;
  const appliedData = fetcher.data?.ok && fetcher.data.intent === "apply" ? fetcher.data : null;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;

  useEffect(() => {
    if (generated) shopify.toast.show(`${generated.results.length} productos generados`);
  }, [generated, shopify]);
  useEffect(() => {
    if (appliedData) shopify.toast.show(`${appliedData.applied} productos publicados`);
  }, [appliedData, shopify]);
  useEffect(() => {
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [error, shopify]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      if (checked) {
        if (current.length >= batchLimit) {
          shopify.toast.show(`Máximo ${batchLimit} productos por lote en tu plan`, { isError: true });
          return current;
        }
        return [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  };

  return (
    <Page
      title="Generación masiva"
      subtitle={`Optimiza varios productos a la vez · Lote máximo: ${batchLimit}`}
    >
      <TitleBar title="Generación masiva" />
      <BlockStack gap="400">
        {error?.code === "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="Sin generaciones disponibles" action={{ content: "Ver planes", url: "/app/billing" }}>
            <p>{error.error}</p>
          </Banner>
        )}
        {error && error.code !== "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="Error">
            <p>{error.error}</p>
          </Banner>
        )}

        <Banner tone="info" title="Cómo funciona la generación masiva">
          <p>
            Selecciona hasta {batchLimit} productos. La IA generará descripciones,
            SEO, etiquetas y alt text para cada uno. Revisa los resultados y
            publícalos todos con un clic. Cada producto consume 1 generación.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <Text as="h2" variant="headingMd">
                    Productos ({selected.length} seleccionados)
                  </Text>
                  <InlineStack gap="200">
                    <Select
                      label="Tono"
                      labelInline
                      options={TONES.map((value) => ({ label: value, value }))}
                      value={tone}
                      onChange={setTone}
                    />
                    <Select
                      label="Idioma"
                      labelInline
                      options={LANGUAGES.map((item) => ({ label: item.label, value: item.code }))}
                      value={language}
                      onChange={setLanguage}
                    />
                  </InlineStack>
                </InlineStack>
                <Divider />
                <div style={{ maxHeight: 520, overflowY: "scroll" }}>
                  <BlockStack gap="200">
                    {products.map((product) => (
                      <Checkbox
                        key={product.id}
                        label={`${product.title}${product.productType ? ` · ${product.productType}` : ""}`}
                        checked={selected.includes(product.id)}
                        onChange={(checked) => toggle(product.id, checked)}
                      />
                    ))}
                  </BlockStack>
                </div>
                <Divider />
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {quota.remaining} generaciones disponibles · Plan {quota.planName} ·{" "}
                    Proveedor: {provider}
                  </Text>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="generate" />
                    <input type="hidden" name="productIds" value={selected.join(",")} />
                    <input type="hidden" name="tone" value={tone} />
                    <input type="hidden" name="language" value={language} />
                    <Button
                      variant="primary"
                      submit
                      loading={generating}
                      disabled={selected.length === 0 || quota.remaining === 0}
                    >
                      Generar {selected.length > 0 ? `${selected.length} productos` : ""}
                    </Button>
                  </fetcher.Form>
                </InlineStack>
              </BlockStack>
            </Card>

            {generated && (
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Resultados ({generated.results.length})
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Quedan {generated.remaining} generaciones
                    </Text>
                  </InlineStack>
                  <Divider />
                  {generated.results.map((result) => (
                    <InlineStack key={result.generationId} align="space-between" blockAlign="center" wrap>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="medium">
                          {result.title}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {result.tagCount} etiquetas · {result.altCount} alt text
                          {result.demo ? " · demo" : ""}
                        </Text>
                      </BlockStack>
                      <Badge tone={result.score >= 80 ? "success" : result.score >= 50 ? "attention" : "critical"}>
                        {`SEO ${result.score}`}
                      </Badge>
                    </InlineStack>
                  ))}
                  {generated.errors.length > 0 && (
                    <Banner tone="warning" title={`${generated.errors.length} productos con error`}>
                      <BlockStack gap="100">
                        {generated.errors.map((item) => (
                          <Text as="p" key={`${item.title}-${item.message}`} variant="bodySm">
                            {item.title}: {item.message}
                          </Text>
                        ))}
                      </BlockStack>
                    </Banner>
                  )}
                  <InlineStack gap="200">
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="apply" />
                      <input
                        type="hidden"
                        name="generationIds"
                        value={generated.results.map((result) => result.generationId).join(",")}
                      />
                      <Button variant="primary" submit loading={applyingState}>
                        {`Publicar los ${generated.results.length} en Shopify`}
                      </Button>
                    </fetcher.Form>
                    <Button url="/app/history">Ver historial</Button>
                  </InlineStack>
                  {appliedData && appliedData.failed.length > 0 && (
                    <Banner tone="warning" title={`${appliedData.failed.length} fallos al publicar`}>
                      <BlockStack gap="100">
                        {appliedData.failed.map((item) => (
                          <Text as="p" key={item.title} variant="bodySm">
                            {item.title}: {item.message}
                          </Text>
                        ))}
                      </BlockStack>
                    </Banner>
                  )}
                </BlockStack>
              </Card>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Tu plan
                </Text>
                <Text as="p" variant="bodyMd">
                  {quota.planName} · {quota.limit} generaciones/mes
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Quedan {quota.remaining}. Los lotes grandes están disponibles en
                  planes superiores.
                </Text>
                <Button url="/app/billing">Mejorar plan</Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
