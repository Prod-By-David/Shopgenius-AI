import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import { getShopSettings, setShopPlan } from "../services/shop.server";
import { resolveSubscriptionUpdate } from "../services/webhook-logic";

/**
 * Mantiene el plan local sincronizado cuando Shopify cambia la suscripción
 * (aprobación, cancelación, expiración o cambio desde el admin).
 * Las reglas de decisión viven en services/webhook-logic.ts (con tests).
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

  const settings = await getShopSettings(shop);
  const decision = resolveSubscriptionUpdate({
    status: subscription?.status,
    name: subscription?.name,
    incomingId: subscription?.admin_graphql_api_id,
    storedId: settings.subscriptionId,
  });

  switch (decision.action) {
    case "set-plan":
      await setShopPlan(shop, decision.planId, {
        subscriptionId: decision.subscriptionId,
        status: decision.status,
      });
      break;
    case "downgrade":
      await setShopPlan(shop, "FREE", { status: decision.status });
      break;
    default:
      console.log(`[webhook] ${topic} para ${shop} ignorado: ${decision.reason}`);
  }

  return new Response(null, { status: 200 });
};
