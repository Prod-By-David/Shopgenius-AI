import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  EmptyState,
  InlineStack,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { auditProduct } from "../services/seo";
import { listProducts } from "../services/shopify-products.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const after = url.searchParams.get("after") ?? null;

  const result = await listProducts(admin, { first: 25, after, query });

  return {
    query,
    after,
    products: result.products.map((product) => {
      const audit = auditProduct({
        id: product.id,
        title: product.title,
        descriptionHtml: product.descriptionHtml,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        tags: product.tags,
        productType: product.productType,
        images: product.images,
        variants: product.variants,
      });
      return {
        id: product.id,
        title: product.title,
        status: product.status,
        productType: product.productType,
        price: product.price,
        currency: product.currency,
        images: product.images.length,
        updatedAt: product.updatedAt,
        score: audit.score,
        issueCount: audit.issues.length,
      };
    }),
    pageInfo: result.pageInfo,
  };
};

export default function ProductsPage() {
  const { products, query, pageInfo, after } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);

  const goToPage = (after: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (after) next.set("after", after);
    else next.delete("after");
    setSearchParams(next);
  };

  return (
    <Page>
      <TitleBar title="Productos" />
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="end" wrap>
              <Form method="get" style={{ flex: 1, minWidth: 280 }}>
                <InlineStack gap="200" blockAlign="end">
                  <Box minWidth="280px">
                    <TextField
                      label="Buscar producto"
                      labelHidden
                      name="q"
                      placeholder="Busca por título, SKU o etiqueta…"
                      value={searchValue}
                      onChange={setSearchValue}
                      autoComplete="off"
                      clearButton
                    />
                  </Box>
                  <Button submit>Buscar</Button>
                </InlineStack>
              </Form>
              <Text as="span" variant="bodySm" tone="subdued">
                {products.length} productos en esta página
              </Text>
            </InlineStack>
            <Divider />
            {products.length === 0 ? (
              <EmptyState
                heading="No hay productos que coincidan"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Prueba con otra búsqueda o crea productos en tu tienda.</p>
              </EmptyState>
            ) : (
              <BlockStack gap="0">
                {products.map((product) => (
                  <Box key={product.id} paddingBlock="300">
                    <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {product.productType ?? "Sin tipo"} ·{" "}
                          {product.price ? `${product.price} ${product.currency ?? ""}` : "Sin precio"} ·{" "}
                          {product.images} imágenes ·{" "}
                          {new Date(product.updatedAt).toLocaleDateString("es-ES")}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={product.score >= 80 ? "success" : product.score >= 50 ? "attention" : "critical"}>
                          {`SEO ${product.score}`}
                        </Badge>
                        {product.issueCount > 0 && (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {product.issueCount} avisos
                          </Text>
                        )}
                        <Button url={`/app/products/${product.id.split("/").pop()}`}>
                          Optimizar
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            )}
            <Divider />
            <InlineStack align="space-between">
              <Button disabled={!after} onClick={() => goToPage(null)}>
                Volver al inicio
              </Button>
              <Button
                disabled={!pageInfo.hasNextPage}
                onClick={() => goToPage(pageInfo.endCursor)}
              >
                Siguiente página
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
