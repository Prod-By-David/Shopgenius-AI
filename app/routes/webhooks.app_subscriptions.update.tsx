import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getPlanByBillingName } from "../services/plans.server";
import { getShopSettings, setShopPlan } from "../services/shop.server";

/**
 * Mantiene el plan local sincronizado cuando Shopify cambia la suscripción
 * (upgrade, downgrade, cancelación, expiración o cambio desde el admin).
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} para ${shop}`);

  const subscription = (payload as {
    app_subscription?: {
      admin_graphql_api_id?: string;
      name?: string;
      status?: string;
    };
  }).app_subscription;

  await getShopSettings(shop);

  const status = (subscription?.status ?? "").toUpperCase();
  const isInactive = ["CANCELLED", "EXPIRED", "DECLINED", "FROZEN"].includes(status);
  const plan = isInactive ? null : getPlanByBillingName(subscription?.name);

  if (plan) {
    await setShopPlan(shop, plan.id, {
      subscriptionId: subscription?.admin_graphql_api_id ?? null,
      status: subscription?.status ?? "ACTIVE",
    });
  } else {
    await setShopPlan(shop, "FREE", { status: status || "NONE" });
  }

  return new Response(null, { status: 200 });
};
