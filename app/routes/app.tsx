import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Banner, Box } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { BILLING_TEST_MODE } from "../config.server";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", testMode: BILLING_TEST_MODE };
};

export default function App() {
  const { apiKey, testMode } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Panel
        </Link>
        <Link to="/app/products">Productos</Link>
        <Link to="/app/bulk">Generación masiva</Link>
        <Link to="/app/seo">Auditoría SEO</Link>
        <Link to="/app/recommendations">Recomendaciones</Link>
        <Link to="/app/history">Historial</Link>
        <Link to="/app/billing">Plan y facturación</Link>
        <Link to="/app/settings">Ajustes</Link>
      </NavMenu>
      {testMode && (
        <Box padding="400" paddingBlockEnd="0">
          <Banner tone="info" title="Modo prueba activo">
            <p>
              Los cobros son simulados: no se realiza ningún cargo real. El paso a
              modo real se decidirá cuando se vaya a vender.
            </p>
          </Banner>
        </Box>
      )}
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
