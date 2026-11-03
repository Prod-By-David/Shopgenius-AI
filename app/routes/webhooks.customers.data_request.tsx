import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Solicitud de datos de clientes (GDPR / privacidad).
 * ShopGenius AI no almacena datos personales de clientes finales: solo
 * productos, contenido generado y ajustes de la tienda. Respondemos 200 y
 * dejamos traza para auditoría.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop}`, JSON.stringify(payload).slice(0, 500));

  const settings = await db.shopSettings.findUnique({ where: { shop } });
  if (settings) {
    console.log(
      `[GDPR] La tienda ${shop} no almacena datos de clientes; no hay datos que exportar.`,
    );
  }

  return new Response(null, { status: 200 });
};
