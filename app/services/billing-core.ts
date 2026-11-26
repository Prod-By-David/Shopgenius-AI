/**
 * Núcleo de la Billing API de Shopify (suscripciones recurrentes).
 *
 * Se usan directamente las mutaciones oficiales de la Admin GraphQL API:
 *   - appSubscriptionCreate  → solicita la suscripción y devuelve la URL de
 *                              confirmación que el comerciante debe aprobar.
 *   - currentAppInstallation.activeSubscriptions → estado real del cobro.
 *   - appSubscriptionCancel  → cancelación.
 *
 * Es un módulo puro (el cliente GraphQL se inyecta) para poder testearlo sin
 * Shopify. Los cargos se crean con `test: true` mientras el proyecto esté en
 * modo prueba (ver `app/config.server.ts`).
 */
import {
  PLANS,
  getPlanByBillingName,
  isBillablePlanId,
  type Plan,
  type PlanId,
} from "./plans.server";

/** Cliente GraphQL que devuelve `authenticate.admin()` de Shopify. */
export interface GraphqlClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

export interface AppSubscriptionSummary {
  id: string;
  name: string;
  status: string;
  test: boolean;
  currentPeriodEnd?: string | null;
}

/**
 * Traduce errores conocidos de Shopify a un mensaje accionable en español.
 * Los mensajes desconocidos se devuelven tal cual.
 */
export function friendlyBillingMessage(message: string): string {
  if (/public distribution|custom apps? cannot use the billing api/i.test(message)) {
    return (
      "Shopify no permite usar la Billing API con esta app porque no tiene distribución pública. " +
      "En Shopify Partners → tu app → Distribución, elige «Distribución pública» (App Store) y vuelve a intentarlo. " +
      `(Detalle de Shopify: ${message})`
    );
  }
  return message;
}

export class BillingError extends Error {
  constructor(message: string) {
    super(friendlyBillingMessage(message));
    this.name = "BillingError";
  }
}

export const ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query ShopGeniusActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        currentPeriodEnd
      }
    }
  }
`;

export const CREATE_SUBSCRIPTION_MUTATION = `#graphql
  mutation ShopGeniusCreateSubscription(
    $name: String!
    $returnUrl: URL!
    $test: Boolean
    $trialDays: Int
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      trialDays: $trialDays
      lineItems: $lineItems
    ) {
      appSubscription {
        id
        name
        status
        test
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

export const CANCEL_SUBSCRIPTION_MUTATION = `#graphql
  mutation ShopGeniusCancelSubscription($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type GraphqlEnvelope<T> = {
  data?: T | null;
  errors?: Array<{ message: string }> | { message: string };
};

async function runGraphql<T>(
  client: GraphqlClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await client.graphql(query, variables ? { variables } : undefined);
  const json = (await response.json()) as GraphqlEnvelope<T>;

  const errors = Array.isArray(json.errors) ? json.errors : json.errors ? [json.errors] : [];
  if (errors.length > 0) {
    throw new BillingError(errors.map((error) => error.message).join("; "));
  }
  if (!json.data) {
    throw new BillingError("Shopify devolvió una respuesta vacía.");
  }
  return json.data;
}

/** Variables de `appSubscriptionCreate` para un plan de pago. */
export function buildCreateSubscriptionVariables(
  plan: Plan,
  options: { returnUrl: string; test: boolean; trialDays?: number },
): Record<string, unknown> {
  return {
    name: plan.billingName,
    returnUrl: options.returnUrl,
    test: options.test,
    trialDays: options.trialDays && options.trialDays > 0 ? options.trialDays : null,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: plan.price, currencyCode: plan.currency },
            interval: plan.interval,
          },
        },
      },
    ],
  };
}

/**
 * Solicita la suscripción a Shopify. Devuelve la URL de confirmación que hay
 * que abrir a nivel superior (`_top`) para que el comerciante apruebe el cargo.
 */
export async function requestSubscription(
  client: GraphqlClient,
  planId: PlanId,
  options: { returnUrl: string; test: boolean; trialDays?: number },
): Promise<{ confirmationUrl: string; subscriptionId: string | null }> {
  if (!isBillablePlanId(planId)) {
    throw new BillingError("El plan seleccionado no es de pago.");
  }

  const data = await runGraphql<{
    appSubscriptionCreate?: {
      appSubscription?: { id: string } | null;
      confirmationUrl?: string | null;
      userErrors?: Array<{ field?: string[] | null; message: string }>;
    } | null;
  }>(client, CREATE_SUBSCRIPTION_MUTATION, buildCreateSubscriptionVariables(PLANS[planId], options));

  const payload = data.appSubscriptionCreate;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new BillingError(userErrors.map((error) => error.message).join(", "));
  }
  if (!payload?.confirmationUrl) {
    throw new BillingError("Shopify no devolvió una URL de confirmación.");
  }

  return {
    confirmationUrl: payload.confirmationUrl,
    subscriptionId: payload.appSubscription?.id ?? null,
  };
}

/** Suscripciones activas de la app en la tienda (según Shopify). */
export async function fetchActiveSubscriptions(
  client: GraphqlClient,
): Promise<AppSubscriptionSummary[]> {
  const data = await runGraphql<{
    currentAppInstallation?: {
      activeSubscriptions?: Array<{
        id: string;
        name: string;
        status: string;
        test: boolean;
        currentPeriodEnd?: string | null;
      }>;
    } | null;
  }>(client, ACTIVE_SUBSCRIPTIONS_QUERY);

  return (data.currentAppInstallation?.activeSubscriptions ?? []).map((subscription) => ({
    id: subscription.id,
    name: subscription.name,
    status: subscription.status,
    test: Boolean(subscription.test),
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
  }));
}

/**
 * Elige la suscripción que concede el plan: activa, de un plan de pago
 * conocido y, en modo real, que no sea un cargo de prueba. Si hay varias,
 * gana el plan más caro.
 */
export function pickActiveSubscription(
  subscriptions: AppSubscriptionSummary[],
  options: { testMode: boolean },
): { subscription: AppSubscriptionSummary; plan: Plan } | null {
  const candidates = subscriptions
    .filter((subscription) => subscription.status.toUpperCase() === "ACTIVE")
    .filter((subscription) => options.testMode || !subscription.test)
    .map((subscription) => ({ subscription, plan: getPlanByBillingName(subscription.name) }))
    .filter(
      (candidate): candidate is { subscription: AppSubscriptionSummary; plan: Plan } =>
        candidate.plan !== null && isBillablePlanId(candidate.plan.id),
    )
    .sort((a, b) => b.plan.price - a.plan.price);

  return candidates[0] ?? null;
}

/** Cancela una suscripción. Lanza `BillingError` si Shopify la rechaza. */
export async function cancelSubscriptionRequest(
  client: GraphqlClient,
  subscriptionId: string,
): Promise<void> {
  const data = await runGraphql<{
    appSubscriptionCancel?: {
      userErrors?: Array<{ field?: string[] | null; message: string }>;
    } | null;
  }>(client, CANCEL_SUBSCRIPTION_MUTATION, { id: subscriptionId });

  const errors = data.appSubscriptionCancel?.userErrors ?? [];
  if (errors.length > 0) {
    throw new BillingError(errors.map((error) => error.message).join(", "));
  }
}

/**
 * URL a la que Shopify devuelve al comerciante tras aprobar el cargo. Para una
 * app embebida debe ser la URL de la app dentro del admin de Shopify.
 */
export function buildBillingReturnUrl(params: {
  shop: string;
  apiKey?: string | null;
  appUrl?: string | null;
}): string {
  const handle = params.shop.match(/^([a-z0-9][a-z0-9-]*)\.myshopify\.com$/i)?.[1];
  if (handle && params.apiKey) {
    return `https://admin.shopify.com/store/${handle}/apps/${params.apiKey}/app/billing`;
  }
  const base = (params.appUrl || "https://localhost").replace(/\/+$/, "");
  return `${base}/app/billing`;
}
