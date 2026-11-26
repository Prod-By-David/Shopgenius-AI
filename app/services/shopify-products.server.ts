import { mergeTags } from "./seo";
import type {
  ProductListResult,
  ShopifyProduct,
} from "./shopify-types";

/** Cliente GraphQL que devuelve `authenticate.admin()` de Shopify. */
export interface AdminClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

/**
 * Fragmento LIGERO para listados (productos, auditoría, lotes, recomendaciones).
 * Shopify limita cada consulta a 1.000 puntos de coste: con 50 productos por
 * página hay que pedir pocas imágenes/variantes por producto.
 *
 * Las imágenes se leen de `media` (MediaImage): `Product.images` está
 * deprecado y sus ids no sirven para `fileUpdate` (alt text).
 */
const PRODUCT_LIST_FRAGMENT = `#graphql
  fragment ShopGeniusProductSummary on Product {
    id
    title
    handle
    status
    productType
    vendor
    tags
    descriptionHtml
    updatedAt
    seo { title description }
    media(first: 5) { nodes { ... on MediaImage { id alt image { url } } } }
    priceRangeV2 { minVariantPrice { amount currencyCode } }
  }
`;

/** Fragmento COMPLETO para la ficha de un producto. */
const PRODUCT_DETAIL_FRAGMENT = `#graphql
  fragment ShopGeniusProductDetail on Product {
    id
    title
    handle
    status
    productType
    vendor
    tags
    descriptionHtml
    updatedAt
    seo { title description }
    media(first: 10) { nodes { ... on MediaImage { id alt image { url } } } }
    variants(first: 15) { nodes { id title price sku } }
    priceRangeV2 { minVariantPrice { amount currencyCode } }
  }
`;

type GraphqlMediaNode = {
  id?: string;
  alt?: string | null;
  image?: { url: string } | null;
};

type GraphqlProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  descriptionHtml: string;
  updatedAt: string;
  seo: { title: string | null; description: string | null } | null;
  media: { nodes: GraphqlMediaNode[] } | null;
  variants?: { nodes: Array<{ id: string; title: string; price: string; sku: string | null }> } | null;
  priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } } | null;
};

export function mapProduct(product: GraphqlProduct): ShopifyProduct {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType || null,
    vendor: product.vendor || null,
    tags: product.tags ?? [],
    descriptionHtml: product.descriptionHtml ?? "",
    updatedAt: product.updatedAt,
    seoTitle: product.seo?.title ?? null,
    seoDescription: product.seo?.description ?? null,
    // `media` también incluye vídeos/modelos 3D (nodos vacíos con este fragmento):
    // solo nos quedamos con imágenes reales.
    images: (product.media?.nodes ?? [])
      .filter((node): node is GraphqlMediaNode & { id: string; image: { url: string } } =>
        Boolean(node?.id && node.image?.url),
      )
      .map((node) => ({
        id: node.id,
        url: node.image.url,
        altText: node.alt ?? null,
      })),
    variants: (product.variants?.nodes ?? []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      sku: variant.sku,
    })),
    price: product.priceRangeV2?.minVariantPrice?.amount ?? null,
    currency: product.priceRangeV2?.minVariantPrice?.currencyCode ?? null,
  };
}

function toGraphqlError(errors: Array<{ message: string }> | undefined): Error | null {
  return errors?.length ? new Error(errors.map((error) => error.message).join("; ")) : null;
}

export async function listProducts(
  admin: AdminClient,
  options: { first?: number; after?: string | null; query?: string | null } = {},
): Promise<ProductListResult> {
  // Máx. 50 por página para no superar el coste máximo de consulta de Shopify.
  const first = Math.min(Math.max(options.first ?? 25, 1), 50);
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
          edges { node { ...ShopGeniusProductSummary } }
          pageInfo { hasNextPage endCursor }
        }
      }
      ${PRODUCT_LIST_FRAGMENT}`,
    { variables: { first, after: options.after ?? null, query: options.query?.trim() || null } },
  );

  const json = (await response.json()) as {
    data?: {
      products?: {
        edges: Array<{ node: GraphqlProduct }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };
    errors?: Array<{ message: string }>;
  };

  const error = toGraphqlError(json.errors);
  if (error) throw error;

  return {
    products: (json.data?.products?.edges ?? []).map((edge) => mapProduct(edge.node)),
    pageInfo: json.data?.products?.pageInfo ?? { hasNextPage: false, endCursor: null },
  };
}

export async function getProduct(
  admin: AdminClient,
  id: string,
): Promise<ShopifyProduct | null> {
  const normalizedId = id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`;
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProduct($id: ID!) {
        product(id: $id) { ...ShopGeniusProductDetail }
      }
      ${PRODUCT_DETAIL_FRAGMENT}`,
    { variables: { id: normalizedId } },
  );

  const json = (await response.json()) as {
    data?: { product?: GraphqlProduct | null };
    errors?: Array<{ message: string }>;
  };

  const error = toGraphqlError(json.errors);
  if (error) throw error;
  return json.data?.product ? mapProduct(json.data.product) : null;
}

export async function countProducts(admin: AdminClient): Promise<number> {
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProductsCount { productsCount { count } }`,
  );
  const json = (await response.json()) as {
    data?: { productsCount?: { count: number } };
    errors?: Array<{ message: string }>;
  };
  const error = toGraphqlError(json.errors);
  if (error) throw error;
  return json.data?.productsCount?.count ?? 0;
}

export interface ProductUpdateInput {
  id: string;
  descriptionHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

/** Actualiza descripción, SEO y etiquetas (`productUpdate` con `ProductUpdateInput`). */
export async function updateProductContent(
  admin: AdminClient,
  input: ProductUpdateInput,
): Promise<{ ok: boolean; errors: string[] }> {
  const product: Record<string, unknown> = { id: input.id };
  if (typeof input.descriptionHtml === "string") {
    product.descriptionHtml = input.descriptionHtml;
  }
  if (input.seoTitle || input.seoDescription) {
    product.seo = {
      title: input.seoTitle ?? null,
      description: input.seoDescription ?? null,
    };
  }
  if (input.tags) {
    product.tags = input.tags;
  }

  const response = await admin.graphql(
    `#graphql
      mutation ShopGeniusProductUpdate($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id title seo { title description } tags descriptionHtml }
          userErrors { field message }
        }
      }`,
    { variables: { product } },
  );

  const json = (await response.json()) as {
    data?: {
      productUpdate?: {
        product?: { id: string } | null;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  const errors = [
    ...(json.errors?.map((error) => error.message) ?? []),
    ...(json.data?.productUpdate?.userErrors?.map((error) => error.message) ?? []),
  ];

  return { ok: errors.length === 0, errors };
}

/**
 * Actualiza el alt text de imágenes de producto (MediaImage) con `fileUpdate`.
 * Requiere el scope `write_files` además de `write_products`.
 */
export async function updateImageAltTexts(
  admin: AdminClient,
  images: Array<{ id: string; alt: string }>,
): Promise<{ ok: boolean; errors: string[] }> {
  const files = images.filter((image) => image.id.startsWith("gid://shopify/MediaImage/"));
  if (files.length === 0) return { ok: true, errors: [] };

  const response = await admin.graphql(
    `#graphql
      mutation ShopGeniusFileUpdate($files: [FileUpdateInput!]!) {
        fileUpdate(files: $files) {
          files {
            ... on MediaImage { id alt }
          }
          userErrors { field message }
        }
      }`,
    { variables: { files: files.map((image) => ({ id: image.id, alt: image.alt })) } },
  );

  const json = (await response.json()) as {
    data?: {
      fileUpdate?: {
        files?: Array<{ id: string; alt?: string | null }>;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  const errors = [
    ...(json.errors?.map((error) => error.message) ?? []),
    ...(json.data?.fileUpdate?.userErrors?.map((error) => error.message) ?? []),
  ];

  return { ok: errors.length === 0, errors };
}

/**
 * Aplica a un producto de Shopify un contenido generado: descripción, SEO,
 * etiquetas (se FUSIONAN con las existentes) y alt text de imágenes.
 */
export async function applyGeneratedContent(
  admin: AdminClient,
  product: ShopifyProduct,
  content: {
    descriptionHtml: string;
    metaTitle: string;
    metaDescription: string;
    tags: string[];
    altTexts: string[];
  },
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  const update = await updateProductContent(admin, {
    id: product.id,
    descriptionHtml: content.descriptionHtml,
    seoTitle: content.metaTitle,
    seoDescription: content.metaDescription,
    tags: mergeTags(product.tags, content.tags),
  });

  const warnings: string[] = [];
  if (update.ok && content.altTexts.length > 0 && product.images.length > 0) {
    const images = product.images
      .slice(0, content.altTexts.length)
      .map((image, index) => ({ id: image.id, alt: content.altTexts[index] ?? image.altText ?? "" }));
    const altResult = await updateImageAltTexts(admin, images);
    if (!altResult.ok) {
      warnings.push(`No se pudieron actualizar los alt text: ${altResult.errors.join(", ")}`);
    }
  }

  return { ok: update.ok, errors: update.errors, warnings };
}

/** Productos del catálogo útiles para recomendaciones cruzadas. */
export async function listCatalogForRecommendations(
  admin: AdminClient,
  excludeProductId?: string,
  limit = 25,
) {
  const result = await listProducts(admin, { first: limit });
  return result.products
    .filter((product) => product.id !== excludeProductId && product.status === "ACTIVE")
    .map((product) => ({
      id: product.id,
      title: product.title,
      type: product.productType,
      price: product.price,
      tags: product.tags,
    }));
}
