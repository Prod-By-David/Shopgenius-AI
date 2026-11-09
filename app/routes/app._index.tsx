import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import type { BillingClient } from "../services/billing.server";
import { BILLING_TEST_MODE, syncBillingState } from "../services/billing.server";
import { getShopSettings, getShopQuota } from "../services/shop.server";
import { countProducts } from "../services/shopify-products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  const settings = await getShopSettings(shop);
  const billingState = await syncBillingState(shop, billing as unknown as BillingClient);
  const quota = await getShopQuota(shop);

  let productCount = 0;
  try {
    productCount = await countProducts(admin);
  } catch (error) {
    console.error("No se pudo contar los productos", error);
  }

  const [recent, applied] = await Promise.all([
    prisma.generation.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.generation.count({ where: { shop, applied: true } }),
  ]);

  return {
    shop,
    productCount,
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      percent: quota.percent,
      planName: quota.plan.name,
    },
    billing: {
      active: billingState.active,
      test: billingState.test,
      planId: billingState.planId,
    },
    provider: settings.aiProvider,
    defaultLanguage: settings.defaultLanguage,
    applied,
    testMode: BILLING_TEST_MODE,
    recent: recent.map((item) => ({
      id: item.id,
      title: item.productTitle ?? "Sin título",
      createdAt: item.createdAt.toISOString(),
      provider: item.provider,
      applied: item.applied,
    })),
  };
};

export default function Dashboard() {
  const {
    shop,
    productCount,
    quota,
    billing,
    provider,
    applied,
    testMode,
    recent,
  } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="ShopGenius AI" />
      <BlockStack gap="500">
        {provider === "demo" && (
          <Banner
            tone="info"
            title="Estás en modo demo"
            action={{ content: "Conectar mi IA", url: "/app/settings" }}
          >
            <p>
              La app genera contenido de ejemplo sin consumir créditos. Añade tu
              API key de OpenAI, Claude o Qwen en Ajustes para producir contenido
              real con tu tono de marca.
            </p>
          </Banner>
        )}

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Productos en la tienda
              </Text>
              <Text as="p" variant="headingLg">
                {productCount}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Generaciones este mes
              </Text>
              <Text as="p" variant="headingLg">
                {quota.used} / {quota.limit}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Contenido aplicado
              </Text>
              <Text as="p" variant="headingLg">
                {applied}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                Plan actual
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="headingLg">
                  {billing.planId === "FREE" ? "Free" : quota.planName}
                </Text>
                {billing.test && <Badge tone="attention">Test</Badge>}
              </InlineStack>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Consumo del plan
                    </Text>
                    <Button url="/app/billing" variant="plain">
                      Gestionar plan
                    </Button>
                  </InlineStack>
                  <ProgressBar progress={quota.percent} tone={quota.percent >= 90 ? "critical" : "primary"} />
                  <Text as="p" variant="bodySm" tone="subdued">
                    {quota.remaining} generaciones disponibles este mes. Se
                    renuevan el día 1 de cada mes.
                  </Text>
                  {quota.remaining === 0 && (
                    <Banner tone="warning" title="Sin generaciones disponibles">
                      <p>Mejora tu plan para seguir creando contenido con IA.</p>
                    </Banner>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Acciones rápidas
                  </Text>
                  <InlineStack gap="300" wrap>
                    <Button variant="primary" url="/app/products">
                      Optimizar un producto
                    </Button>
                    <Button url="/app/bulk">Generación masiva</Button>
                    <Button url="/app/seo">Auditar SEO</Button>
                  </InlineStack>
                  <Divider />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Tienda conectada: {shop}
                    {testMode && " · Facturación en modo test de Shopify"}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Últimas generaciones
                    </Text>
                    <Button url="/app/history" variant="plain">
                      Ver historial
                    </Button>
                  </InlineStack>
                  {recent.length === 0 ? (
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <Text as="p" tone="subdued">
                        Todavía no has generado contenido. Empieza con un producto
                        y la IA creará descripción, SEO, etiquetas y alt text.
                      </Text>
                    </Box>
                  ) : (
                    <BlockStack gap="200">
                      {recent.map((item) => (
                        <InlineStack key={item.id} align="space-between" blockAlign="center" wrap>
                          <BlockStack gap="050">
                            <Text as="span" variant="bodyMd" fontWeight="medium">
                              {item.title}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {new Date(item.createdAt).toLocaleString("es-ES")} ·{" "}
                              {item.provider}
                            </Text>
                          </BlockStack>
                          <Badge tone={item.applied ? "success" : undefined}>
                            {item.applied ? "Aplicado" : "Borrador"}
                          </Badge>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Cómo funciona
                  </Text>
                  <Text as="p" variant="bodyMd">
                    1. Elige un producto de tu catálogo.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. La IA lee título, variantes, etiquetas e imágenes.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. Genera descripción, SEO, tags y alt text.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. Revisas y aplicas a Shopify en un clic.
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Buenas prácticas
                  </Text>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm">
                      · Mantén descripciones de 300–900 caracteres.
                    </Text>
                    <Text as="p" variant="bodySm">
                      · Meta título ≤ 60 caracteres y meta descripción ≤ 160.
                    </Text>
                    <Text as="p" variant="bodySm">
                      · Usa 5–10 etiquetas por producto.
                    </Text>
                    <Text as="p" variant="bodySm">
                      · Revisa siempre el contenido antes de publicarlo.
                    </Text>
                  </BlockStack>
                  <Link to="/app/settings">Configurar voz de marca →</Link>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}