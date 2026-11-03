import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
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
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { AiError, generateRecommendations } from "../services/ai.server";
import { LANGUAGES, TONES, type RecommendationResult } from "../services/ai-core";
import {
  QuotaExceededError,
  assertQuota,
  buildAiConfig,
  getShopQuota,
  getShopSettings,
  recordGeneration,
} from "../services/shop.server";
import { getProduct, listProducts } from "../services/shopify-products.server";
import type { CatalogItem } from "../services/ai-core";

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
      tags: product.tags,
      price: product.price,
    })),
    defaults: { tone: settings.defaultTone, language: settings.defaultLanguage },
    provider: settings.aiProvider,
    quota: { remaining: quota.remaining, limit: quota.limit, planName: quota.plan.name },
  };
};

type RecommendationActionResult =
  | {
      ok: true;
      productId: string;
      productTitle: string;
      result: RecommendationResult;
      demo: boolean;
      remaining: number;
    }
  | { ok: false; error: string; code?: string };

export const action = async ({ request }: ActionFunctionArgs): Promise<RecommendationActionResult> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");

  try {
    if (!productId) return { ok: false, error: "Selecciona un producto principal." };
    const quota = await assertQuota(shop);
    const settings = await getShopSettings(shop);
    const product = await getProduct(admin, productId);
    if (!product) return { ok: false, error: "Producto no encontrado." };

    const catalogResult = await listProducts(admin, { first: 50 });
    const catalog: CatalogItem[] = catalogResult.products
      .filter((item) => item.id !== product.id && item.status === "ACTIVE")
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.productType,
        price: item.price,
        tags: item.tags,
      }));

    if (catalog.length === 0) {
      return { ok: false, error: "Necesitas al menos otro producto activo para generar recomendaciones." };
    }

    const language = String(formData.get("language") ?? settings.defaultLanguage);
    const tone = String(formData.get("tone") ?? settings.defaultTone);

    const aiResult = await generateRecommendations(
      {
        id: product.id,
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        price: product.price,
        images: product.images,
      },
      catalog,
      {
        tone,
        language,
        storeDescription: settings.storeDescription ?? undefined,
        brandVoice: settings.brandVoice ?? undefined,
      },
      buildAiConfig(settings),
    );

    await recordGeneration({
      shop,
      type: "PRODUCT_RECOMMENDATIONS",
      productId: product.id,
      productTitle: product.title,
      provider: aiResult.provider,
      model: aiResult.model,
      input: { productId: product.id, language, tone, catalogSize: catalog.length },
      output: aiResult.result,
      tokensIn: aiResult.tokensIn,
      tokensOut: aiResult.tokensOut,
      shopSettingsId: settings.id,
    });

    return {
      ok: true,
      productId: product.id,
      productTitle: product.title,
      result: aiResult.result,
      demo: aiResult.demo,
      remaining: Math.max(0, quota.remaining - 1),
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    if (error instanceof AiError) return { ok: false, error: error.message, code: error.code };
    console.error("Error generando recomendaciones", error);
    return { ok: false, error: "No se pudieron generar las recomendaciones." };
  }
};

export default function RecommendationsPage() {
  const { products, defaults, provider, quota } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<RecommendationActionResult>();
  const shopify = useAppBridge();

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);

  const loading = fetcher.state !== "idle";
  const data = fetcher.data;
  const error = data && !data.ok ? data : null;
  const success = data && data.ok ? data : null;

  useEffect(() => {
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [error, shopify]);

  return (
    <Page
      title="Recomendaciones con IA"
      subtitle="Cross-sell basado en tu catálogo real, listo para copiar a tu tienda"
    >
      <TitleBar title="Recomendaciones" />
      <BlockStack gap="400">
        {error?.code === "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="Sin generaciones disponibles" action={{ content: "Ver planes", url: "/app/billing" }}>
            <p>{error.error}</p>
          </Banner>
        )}
        {error && error.code !== "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="No se pudo generar">
            <p>{error.error}</p>
          </Banner>
        )}
        {success?.demo && (
          <Banner tone="info" title="Recomendaciones demo">
            <p>
              Generadas sin proveedor de IA a partir de etiquetas y tipos de
              producto. Configura tu API key para recomendaciones más precisas.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Configurar recomendaciones
                  </Text>
                  <FormLayout>
                    <Select
                      label="Producto principal"
                      options={products.map((product) => ({
                        label: product.title,
                        value: product.id,
                      }))}
                      value={productId}
                      onChange={setProductId}
                      disabled={products.length === 0}
                    />
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
                  </FormLayout>
                  <InlineStack align="space-between" blockAlign="center" wrap>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {quota.remaining} generaciones disponibles · Proveedor: {provider}
                    </Text>
                    <fetcher.Form method="post">
                      <input type="hidden" name="productId" value={productId} />
                      <input type="hidden" name="tone" value={tone} />
                      <input type="hidden" name="language" value={language} />
                      <Button variant="primary" submit loading={loading} disabled={!productId}>
                        Generar recomendaciones
                      </Button>
                    </fetcher.Form>
                  </InlineStack>
                </BlockStack>
              </Card>

              {success && (
                <Card>
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        {success.result.headline}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Basado en «{success.productTitle}» · quedan {success.remaining} generaciones
                      </Text>
                    </BlockStack>
                    <Divider />
                    {success.result.recommendations.length === 0 ? (
                      <Text as="p" tone="subdued">
                        No se han encontrado productos complementarios en el catálogo.
                      </Text>
                    ) : (
                      success.result.recommendations.map((recommendation) => (
                        <Card key={recommendation.productId}>
                          <BlockStack gap="200">
                            <InlineStack align="space-between" blockAlign="center" wrap>
                              <Text as="h3" variant="headingSm">
                                {recommendation.title}
                              </Text>
                              <Badge tone="success">
                                {`${Math.round(recommendation.confidence * 100)}% afinidad`}
                              </Badge>
                            </InlineStack>
                            <ProgressBar progress={Math.round(recommendation.confidence * 100)} />
                            <Text as="p" variant="bodyMd">
                              {recommendation.reason}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {recommendation.bundleIdea}
                            </Text>
                            <InlineStack gap="200">
                              <Button
                                url={`/app/products/${recommendation.productId.split("/").pop()}`}
                                size="slim"
                              >
                                Optimizar este producto
                              </Button>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      ))
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
                    Cómo usarlo
                  </Text>
                  <Text as="p" variant="bodySm">
                    Copia la idea de pack en las descripciones, crea una colección
                    «Combina con…» o úsala en tu sección de productos
                    recomendados.
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    La IA solo elige productos de tu catálogo activo, nunca inventa
                    referencias.
                  </Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Plan actual
                  </Text>
                  <Text as="p" variant="bodySm">
                    {quota.planName} · {quota.limit} generaciones/mes
                  </Text>
                  <Button url="/app/billing" variant="plain">
                    Mejorar plan
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
