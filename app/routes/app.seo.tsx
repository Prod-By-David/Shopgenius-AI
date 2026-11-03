import { useEffect } from "react";
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
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AiError, generateProductContent } from "../services/ai.server";
import { auditProduct, summarizeAudit } from "../services/seo";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { products } = await listProducts(admin, { first: 50 });
  const quota = await getShopQuota(session.shop);

  const audits = products.map((product) =>
    auditProduct({
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      tags: product.tags,
      productType: product.productType,
      images: product.images,
      variants: product.variants,
    }),
  );

  const summary = summarizeAudit(audits);
  const issueCounts = new Map<string, { message: string; count: number; severity: string }>();
  audits.forEach((audit) => {
    audit.issues.forEach((issue) => {
      const current = issueCounts.get(issue.code);
      issueCounts.set(issue.code, {
        message: issue.message,
        severity: issue.severity,
        count: (current?.count ?? 0) + 1,
      });
    });
  });

  return {
    summary,
    quota: { remaining: quota.remaining, limit: quota.limit, planName: quota.plan.name },
    audits: audits
      .filter((audit) => audit.issues.length > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 25)
      .map((audit) => {
        const product = products.find((item) => item.id === audit.productId);
        return {
          ...audit,
          productType: product?.productType ?? null,
          topIssue: audit.issues[0]?.message ?? "",
        };
      }),
    issues: Array.from(issueCounts.entries())
      .map(([code, value]) => ({ code, ...value }))
      .sort((a, b) => b.count - a.count),
  };
};

type FixResult =
  | { ok: true; productId: string; title: string; score: number; remaining: number; warnings: string[] }
  | { ok: false; error: string; code?: string };

export const action = async ({ request }: ActionFunctionArgs): Promise<FixResult> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");

  try {
    const quota = await assertQuota(shop);
    const product = await getProduct(admin, productId);
    if (!product) return { ok: false, error: "Producto no encontrado." };

    const settings = await getShopSettings(shop);
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
        tone: settings.defaultTone,
        language: settings.defaultLanguage,
        keywords: settings.defaultKeywords
          ? settings.defaultKeywords.split(",").map((keyword) => keyword.trim())
          : product.tags.slice(0, 3),
        brandVoice: settings.brandVoice ?? undefined,
        storeDescription: settings.storeDescription ?? undefined,
        imageCount: Math.min(product.images.length, 5),
      },
      buildAiConfig(settings),
    );

    const update = await updateProductContent(admin, {
      id: product.id,
      descriptionHtml: aiResult.content.descriptionHtml,
      seoTitle: aiResult.content.metaTitle,
      seoDescription: aiResult.content.metaDescription,
      tags: aiResult.content.tags,
    });
    if (!update.ok) {
      return { ok: false, error: update.errors.join(", ") };
    }

    const warnings: string[] = [];
    if (aiResult.content.altTexts.length > 0) {
      const images = product.images
        .slice(0, aiResult.content.altTexts.length)
        .map((image, index) => ({ id: image.id, alt: aiResult.content.altTexts[index] ?? "" }))
        .filter((image) => image.id.startsWith("gid://"));
      if (images.length > 0) {
        const alt = await updateImageAltTexts(admin, images);
        if (!alt.ok) warnings.push(alt.errors.join(", "));
      }
    }

    const generation = await recordGeneration({
      shop,
      type: "PRODUCT_DESCRIPTION",
      productId: product.id,
      productTitle: product.title,
      provider: aiResult.provider,
      model: aiResult.model,
      input: { productId: product.id, source: "seo-audit" },
      output: aiResult.content,
      tokensIn: aiResult.tokensIn,
      tokensOut: aiResult.tokensOut,
      shopSettingsId: settings.id,
      applied: true,
    });

    await prisma.generation.update({
      where: { id: generation.id },
      data: { applied: true, appliedAt: new Date() },
    });

    return {
      ok: true,
      productId: product.id,
      title: product.title,
      score: 100,
      remaining: Math.max(0, quota.remaining - 1),
      warnings,
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    if (error instanceof AiError) return { ok: false, error: error.message, code: error.code };
    console.error("Error corrigiendo producto", error);
    return { ok: false, error: "No se pudo corregir el producto." };
  }
};

export default function SeoAuditPage() {
  const { summary, audits, issues, quota } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<FixResult>();
  const shopify = useAppBridge();
  const fixing = fetcher.state !== "idle" ? String(fetcher.formData?.get("productId") ?? "") : "";

  const result = fetcher.data;
  const error = result && !result.ok ? result : null;
  const success = result && result.ok ? result : null;

  useEffect(() => {
    if (success) shopify.toast.show(`"${success.title}" optimizado`);
  }, [success, shopify]);
  useEffect(() => {
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [error, shopify]);

  return (
    <Page
      title="Auditoría SEO"
      subtitle="Detecta productos con contenido incompleto y corrígelos con IA"
    >
      <TitleBar title="Auditoría SEO" />
      <BlockStack gap="400">
        {success && (
          <Banner tone="success" title={`${success.title} optimizado`} onDismiss={() => undefined}>
            <p>
              Descripción, metadatos, etiquetas y alt text actualizados. Quedan{" "}
              {success.remaining} generaciones.
            </p>
            {success.warnings.length > 0 && <p>{success.warnings.join(" · ")}</p>}
          </Banner>
        )}
        {error?.code === "QUOTA_EXCEEDED" && (
          <Banner tone="critical" title="Sin generaciones disponibles" action={{ content: "Ver planes", url: "/app/billing" }}>
            <p>{error.error}</p>
          </Banner>
        )}

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Salud SEO media
              </Text>
              <Text as="p" variant="headingLg">
                {summary.averageScore}/100
              </Text>
              <ProgressBar progress={summary.averageScore} />
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Productos analizados
              </Text>
              <Text as="p" variant="headingLg">
                {summary.totalProducts}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Incidencias críticas
              </Text>
              <Text as="p" variant="headingLg">
                {summary.critical}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Generaciones disponibles
              </Text>
              <Text as="p" variant="headingLg">
                {quota.remaining}
              </Text>
              <Text as="span" variant="bodySm" tone="subdued">
                Plan {quota.planName}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Productos que necesitan atención
                </Text>
                <Divider />
                {audits.length === 0 ? (
                  <Box padding="400">
                    <Text as="p" tone="subdued">
                      No se han detectado problemas en los primeros 50 productos.
                      ¡Buen trabajo!
                    </Text>
                  </Box>
                ) : (
                  <BlockStack gap="0">
                    {audits.map((audit) => (
                      <Box key={audit.productId} paddingBlock="300" borderBlockEndWidth="025" borderColor="border">
                        <InlineStack align="space-between" blockAlign="center" wrap gap="300">
                          <BlockStack gap="050">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                              {audit.title}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {audit.topIssue} · {audit.productType ?? "Sin tipo"}
                            </Text>
                          </BlockStack>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone={audit.score >= 80 ? "success" : audit.score >= 50 ? "attention" : "critical"}>
                              {`SEO ${audit.score}`}
                            </Badge>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {audit.issues.length} avisos
                            </Text>
                            <fetcher.Form method="post">
                              <input type="hidden" name="productId" value={audit.productId} />
                              <Button
                                submit
                                variant="primary"
                                size="slim"
                                loading={fixing === audit.productId}
                                disabled={quota.remaining <= 0}
                              >
                                Corregir con IA
                              </Button>
                            </fetcher.Form>
                            <Button
                              size="slim"
                              url={`/app/products/${audit.productId.split("/").pop()}`}
                            >
                              Revisar
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Incidencias más frecuentes
                </Text>
                <Divider />
                {issues.length === 0 ? (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Sin incidencias registradas.
                  </Text>
                ) : (
                  issues.slice(0, 8).map((issue) => (
                    <InlineStack key={issue.code} align="space-between" blockAlign="center">
                      <Text as="span" variant="bodySm">
                        {issue.message}
                      </Text>
                      <Badge
                        tone={
                          issue.severity === "critical"
                            ? "critical"
                            : issue.severity === "warning"
                              ? "warning"
                              : undefined
                        }
                      >
                        {String(issue.count)}
                      </Badge>
                    </InlineStack>
                  ))
                )}
              </BlockStack>
            </Card>
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Cómo puntuamos
                  </Text>
                  <Text as="p" variant="bodySm">
                    Descripción 25 pts · meta título 20 · meta descripción 20 ·
                    etiquetas 15 · keywords 10 · bullets 10. Los avisos críticos
                    restan 22 puntos y los warnings 10.
                  </Text>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
