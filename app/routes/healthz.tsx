import type { LoaderFunctionArgs } from "@remix-run/node";

/** Endpoint de salud para monitores y para el checklist de revisión. */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  return new Response(
    JSON.stringify({
      status: "ok",
      app: "ShopGenius AI",
      version: "1.0.0",
      apiVersion: process.env.SHOPIFY_API_VERSION ?? "2025-01",
      timestamp: new Date().toISOString(),
      host: url.host,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
};
