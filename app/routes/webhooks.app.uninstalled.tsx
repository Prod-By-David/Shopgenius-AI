import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} para ${shop}`);

  // Se borran siempre las sesiones de la tienda (aunque `session` ya no exista).
  await db.session.deleteMany({ where: { shop } });

  // Conservamos los ajustes y el historial para que una reinstalación sea
  // inmediata. El borrado definitivo ocurre en shop/redact.
  await db.shopSettings.updateMany({
    where: { shop },
    data: { plan: "FREE", subscriptionId: null, subscriptionStatus: "UNINSTALLED" },
  });

  return new Response();
};
