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

const PRODUCT_FRAGMENT = `#graphql
  fragment ShopGeniusProduct on Product {
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
    featuredImage { url altText }
    images(first: 8) { nodes { id url altText } }
    variants(first: 15) { nodes { id title price sku } }
    priceRangeV2 { minVariantPrice { amount currencyCode } }
  }
`;

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
  featuredImage: { url: string; altText: string | null } | null;
  images: { nodes: Array<{ id: string; url: string; altText: string | null }> } | null;
  variants: { nodes: Array<{ id: string; title: string; price: string; sku: string | null }> } | null;
  priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } } | null;
};

function mapProduct(product: GraphqlProduct): ShopifyProduct {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType ?? null,
    vendor: product.vendor ?? null,
    tags: product.tags ?? [],
    descriptionHtml: product.descriptionHtml ?? "",
    updatedAt: product.updatedAt,
    seoTitle: product.seo?.title ?? null,
    seoDescription: product.seo?.description ?? null,
    images: (product.images?.nodes ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
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

export async function listProducts(
  admin: AdminClient,
  options: { first?: number; after?: string | null; query?: string | null } = {},
): Promise<ProductListResult> {
  const first = Math.min(Math.max(options.first ?? 25, 1), 100);
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
          edges { node { ...ShopGeniusProduct } }
          pageInfo { hasNextPage endCursor }
        }
      }
      ${PRODUCT_FRAGMENT}`,
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

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }

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
        product(id: $id) { ...ShopGeniusProduct }
      }
      ${PRODUCT_FRAGMENT}`,
    { variables: { id: normalizedId } },
  );

  const json = (await response.json()) as {
    data?: { product?: GraphqlProduct | null };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  return json.data?.product ? mapProduct(json.data.product) : null;
}

export async function countProducts(admin: AdminClient): Promise<number> {
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProductsCount { productsCount { count } }`,
  );
  const json = (await response.json()) as {
    data?: { productsCount?: { count: number } };
  };
  return json.data?.productsCount?.count ?? 0;
}

export interface ProductUpdateInput {
  id: string;
  descriptionHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

export async function updateProductContent(
  admin: AdminClient,
  input: ProductUpdateInput,
): Promise<{ ok: boolean; errors: string[] }> {
  const productInput: Record<string, unknown> = { id: input.id };
  if (typeof input.descriptionHtml === "string") {
    productInput.descriptionHtml = input.descriptionHtml;
  }
  if (input.seoTitle || input.seoDescription) {
    productInput.seo = {
      title: input.seoTitle ?? null,
      description: input.seoDescription ?? null,
    };
  }
  if (input.tags) {
    productInput.tags = input.tags;
  }

  const response = await admin.graphql(
    `#graphql
      mutation ShopGeniusProductUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id title seo { title description } tags descriptionHtml }
          userErrors { field message }
        }
      }`,
    { variables: { input: productInput } },
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

export async function updateImageAltTexts(
  admin: AdminClient,
  images: Array<{ id: string; alt: string }>,
): Promise<{ ok: boolean; errors: string[] }> {
  if (images.length === 0) return { ok: true, errors: [] };

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
    { variables: { files: images.map((image) => ({ id: image.id, alt: image.alt })) } },
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
