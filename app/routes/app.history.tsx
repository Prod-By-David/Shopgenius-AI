import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { safeParseJson } from "../services/shop.server";
import type { GeneratedContent } from "../services/ai-core";
import { stripHtml } from "../services/seo";

const PAGE_SIZE = 20;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.generation.count({ where: { shop: session.shop } }),
  ]);

  return {
    page,
    total,
    hasNextPage: (page + 1) * PAGE_SIZE < total,
    items: generations.map((item) => {
      const output = safeParseJson<GeneratedContent | null>(item.outputJson, null);
      return {
        id: item.id,
        title: item.productTitle ?? "Sin título",
        type: item.type,
        provider: item.provider,
        model: item.model,
        createdAt: item.createdAt.toISOString(),
        applied: item.applied,
        tokensIn: item.tokensIn,
        tokensOut: item.tokensOut,
        productId: item.productId,
        metaTitle: output?.metaTitle ?? "",
        metaDescription: output?.metaDescription ?? "",
        descriptionPreview: stripHtml(output?.descriptionHtml ?? "").slice(0, 240),
        tags: output?.tags ?? [],
      };
    }),
  };
};

export default function HistoryPage() {
  const { items, page, total, hasNextPage } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (nextPage > 0) params.set("page", String(nextPage));
    setSearchParams(params);
  };

  return (
    <Page title="Historial de generaciones" subtitle={`${total} generaciones registradas`}>
      <TitleBar title="Historial" />
      <BlockStack gap="400">
        {items.length === 0 ? (
          <Card>
            <EmptyState
              heading="Todavía no hay generaciones"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Cuando generes contenido con IA aparecerá aquí, con el resultado y
                su estado de publicación.
              </p>
              <Button variant="primary" url="/app/products">
                Optimizar un producto
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <Card>
            <BlockStack gap="0">
              {items.map((item) => (
                <Box
                  key={item.id}
                  paddingBlock="400"
                  borderBlockEndWidth="025"
                  borderColor="border"
                >
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center" wrap>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {item.title}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {new Date(item.createdAt).toLocaleString("es-ES")} ·{" "}
                          {item.provider} / {item.model} · {item.tokensIn + item.tokensOut} tokens
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Badge tone={item.applied ? "success" : undefined}>
                          {item.applied ? "Publicado" : "Borrador"}
                        </Badge>
                        {item.productId && (
                          <Button
                            size="slim"
                            url={`/app/products/${item.productId.split("/").pop()}`}
                          >
                            Abrir producto
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>

                    {item.metaTitle && (
                      <Text as="p" variant="bodySm">
                        <strong>Meta título:</strong> {item.metaTitle}
                      </Text>
                    )}
                    {item.metaDescription && (
                      <Text as="p" variant="bodySm">
                        <strong>Meta descripción:</strong> {item.metaDescription}
                      </Text>
                    )}
                    {item.descriptionPreview && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {item.descriptionPreview}…
                      </Text>
                    )}
                    {item.tags.length > 0 && (
                      <InlineStack gap="150" wrap>
                        {item.tags.slice(0, 8).map((tag) => (
                          <Badge key={`${item.id}-${tag}`}>{tag}</Badge>
                        ))}
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>
              ))}
            </BlockStack>
          </Card>
        )}

        <InlineStack align="space-between">
          <Button disabled={page === 0} onClick={() => goToPage(page - 1)}>
            Anterior
          </Button>
          <Text as="span" variant="bodySm" tone="subdued">
            Página {page + 1}
          </Text>
          <Button disabled={!hasNextPage} onClick={() => goToPage(page + 1)}>
            Siguiente
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
