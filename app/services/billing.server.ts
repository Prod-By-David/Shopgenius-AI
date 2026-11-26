import { BILLING_TEST_MODE, BILLING_TRIAL_DAYS } from "../config.server";
import {
  BillingError,
  cancelSubscriptionRequest,
  fetchActiveSubscriptions,
  pickActiveSubscription,
  requestSubscription,
  type AppSubscriptionSummary,
  type GraphqlClient,
} from "./billing-core";
import { PLANS, getPlan, isBillablePlanId, type PlanId } from "./plans.server";
import { getShopSettings, setShopPlan } from "./shop.server";

export { BILLING_TEST_MODE };
export type { AppSubscriptionSummary, GraphqlClient };

export interface BillingState {
  planId: PlanId;
  planName: string;
  /** Hay un cargo activo (de prueba o real) concediendo un plan de pago. */
  active: boolean;
  /** El cargo activo es un cargo de prueba (sandbox de Shopify). */
  test: boolean;
  subscription: AppSubscriptionSummary | null;
  /** `false` si no se pudo consultar a Shopify y se devuelve el último estado conocido. */
  verified: boolean;
}

/**
 * Lee el estado real de la suscripción en Shopify y sincroniza el plan local.
 * Shopify es la fuente de verdad: si no hay un cargo activo, la tienda vuelve a
 * Free. Si Shopify no responde NO se degrada el plan (evita bajar de plan a un
 * comerciante que paga por un fallo puntual de red).
 */
export async function syncBillingState(
  shop: string,
  admin: GraphqlClient,
): Promise<BillingState> {
  const settings = await getShopSettings(shop);

  let subscriptions: AppSubscriptionSummary[];
  try {
    subscriptions = await fetchActiveSubscriptions(admin);
  } catch (error) {
    console.error(`No se pudo comprobar la suscripción de ${shop}`, error);
    const stored = getPlan(settings.plan);
    return {
      planId: stored.id,
      planName: stored.name,
      active: stored.id !== "FREE",
      test: BILLING_TEST_MODE,
      subscription: null,
      verified: false,
    };
  }

  const match = pickActiveSubscription(subscriptions, { testMode: BILLING_TEST_MODE });

  if (match) {
    if (settings.plan !== match.plan.id || settings.subscriptionId !== match.subscription.id) {
      await setShopPlan(shop, match.plan.id, {
        subscriptionId: match.subscription.id,
        status: match.subscription.status,
      });
    }
    return {
      planId: match.plan.id,
      planName: match.plan.name,
      active: true,
      test: match.subscription.test,
      subscription: match.subscription,
      verified: true,
    };
  }

  if (settings.plan !== "FREE") {
    await setShopPlan(shop, "FREE", { status: "NONE" });
  }

  return {
    planId: "FREE",
    planName: PLANS.FREE.name,
    active: false,
    test: BILLING_TEST_MODE,
    subscription: null,
    verified: true,
  };
}

/**
 * Crea la suscripción en Shopify (Billing API) y devuelve la URL de
 * confirmación. En modo prueba el cargo es de prueba: no se factura nada.
 */
export async function createSubscription(
  admin: GraphqlClient,
  planId: PlanId,
  returnUrl: string,
): Promise<string> {
  if (!isBillablePlanId(planId)) {
    throw new BillingError("El plan seleccionado no es de pago.");
  }
  const { confirmationUrl } = await requestSubscription(admin, planId, {
    returnUrl,
    test: BILLING_TEST_MODE,
    trialDays: BILLING_TRIAL_DAYS,
  });
  return confirmationUrl;
}

/** Cancela la suscripción activa contra la Admin API. */
export async function cancelSubscription(
  admin: GraphqlClient,
  subscriptionId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!subscriptionId) return { ok: true };
  try {
    await cancelSubscriptionRequest(admin, subscriptionId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cancelar la suscripción.",
    };
  }
}
