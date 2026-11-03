import {
  BILLABLE_PLAN_IDS,
  PLANS,
  getPlan,
  getPlanByBillingName,
  type PlanId,
} from "./plans.server";
import { getShopSettings, setShopPlan } from "./shop.server";

export const BILLING_TEST_MODE = process.env.BILLING_TEST_MODE !== "false";

export interface AppSubscriptionSummary {
  id: string;
  name: string;
  status: string;
  test: boolean;
  currentPeriodEnd?: string | null;
}

export interface BillingClient {
  check(options: {
    plans: string[];
    isTest?: boolean;
  }): Promise<{
    hasActivePayment: boolean;
    appSubscriptions: AppSubscriptionSummary[];
  }>;
  request(options: {
    plan: string;
    isTest?: boolean;
    returnUrl?: string;
  }): Promise<{ confirmationUrl: string | null }>;
}

export const BILLABLE_BILLING_NAMES = BILLABLE_PLAN_IDS.map(
  (planId) => PLANS[planId].billingName,
);

export interface BillingState {
  planId: PlanId;
  planName: string;
  active: boolean;
  test: boolean;
  subscription: AppSubscriptionSummary | null;
  hasActivePayment: boolean;
}

/**
 * Lee el estado real de la suscripción en Shopify y sincroniza el plan local.
 * Shopify es la fuente de verdad: si no hay pago activo, la tienda vuelve a Free.
 */
export async function syncBillingState(
  shop: string,
  billing: BillingClient,
): Promise<BillingState> {
  const settings = await getShopSettings(shop);
  let hasActivePayment = false;
  let subscription: AppSubscriptionSummary | null = null;

  try {
    const result = await billing.check({
      plans: BILLABLE_BILLING_NAMES,
      isTest: BILLING_TEST_MODE,
    });
    hasActivePayment = result.hasActivePayment;
    subscription = result.appSubscriptions?.[0] ?? null;
  } catch (error) {
    console.error(`No se pudo comprobar la suscripción de ${shop}`, error);
  }

  const matchedPlan = subscription ? getPlanByBillingName(subscription.name) : null;

  if (hasActivePayment && matchedPlan) {
    if (settings.plan !== matchedPlan.id || settings.subscriptionId !== subscription?.id) {
      await setShopPlan(shop, matchedPlan.id, {
        subscriptionId: subscription?.id ?? null,
        status: subscription?.status ?? "ACTIVE",
      });
    }
    return {
      planId: matchedPlan.id,
      planName: matchedPlan.name,
      active: true,
      test: subscription?.test ?? BILLING_TEST_MODE,
      subscription,
      hasActivePayment,
    };
  }

  const fallbackPlan = getPlan(settings.plan);
  if (fallbackPlan.id !== "FREE" && !hasActivePayment) {
    await setShopPlan(shop, "FREE", { status: "NONE" });
  }

  return {
    planId: hasActivePayment && fallbackPlan.id !== "FREE" ? fallbackPlan.id : "FREE",
    planName: hasActivePayment ? fallbackPlan.name : PLANS.FREE.name,
    active: hasActivePayment,
    test: BILLING_TEST_MODE,
    subscription,
    hasActivePayment,
  };
}

export async function createSubscription(
  billing: BillingClient,
  planId: PlanId,
  returnUrl?: string,
): Promise<string | null> {
  if (planId === "FREE") return null;
  const plan = PLANS[planId];
  const result = await billing.request({
    plan: plan.billingName,
    isTest: BILLING_TEST_MODE,
    returnUrl,
  });
  return result.confirmationUrl ?? null;
}

/** Cancela la suscripción activa directamente contra la Admin API. */
export async function cancelSubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  subscriptionId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!subscriptionId) return { ok: true };

  const response = await admin.graphql(
    `#graphql
      mutation cancelAppSubscription($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription { id status }
          userErrors { field message }
        }
      }`,
    { variables: { id: subscriptionId } },
  );

  const json = (await response.json()) as {
    data?: {
      appSubscriptionCancel?: {
        appSubscription?: { id: string; status: string } | null;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
  };

  const errors = json.data?.appSubscriptionCancel?.userErrors ?? [];
  if (errors.length > 0) {
    return { ok: false, error: errors.map((error) => error.message).join(", ") };
  }
  return { ok: true };
}
