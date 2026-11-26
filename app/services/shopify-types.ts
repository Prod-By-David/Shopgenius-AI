/** Tipos compartidos entre servidor y UI para productos de Shopify. */

export interface ShopifyImage {
  id: string;
  url: string;
  altText: string | null;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku: string | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  descriptionHtml: string;
  updatedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  price: string | null;
  currency: string | null;
}

export interface ProductPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ProductListResult {
  products: ShopifyProduct[];
  pageInfo: ProductPageInfo;
}
