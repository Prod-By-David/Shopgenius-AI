import type { LoaderFunctionArgs } from "@remix-run/node";

import { APP_MODE, BILLING_TEST_MODE, SHOPIFY_API_VERSION_LABEL } from "../config.server";

/** Endpoint de salud para monitores y para el checklist de revisión. */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  return new Response(
    JSON.stringify({
      status: "ok",
      app: "ShopGenius AI",
      version: "1.0.0",
      mode: APP_MODE,
      billingTestMode: BILLING_TEST_MODE,
      apiVersion: SHOPIFY_API_VERSION_LABEL,
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
