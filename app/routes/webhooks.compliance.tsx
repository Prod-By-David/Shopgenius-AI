import type { ActionFunctionArgs } from "@remix-run/node";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import { toComplianceTopic } from "../services/webhook-logic";

/**
 * Webhooks obligatorios de privacidad (RGPD) para la App Store de Shopify.
 * Se declaran con `compliance_topics` en shopify.app.toml y llegan todos aquí:
 *  - customers/data_request: solicitud de datos de un cliente.
 *  - customers/redact: borrado de los datos de un cliente.
 *  - shop/redact: borrado de todos los datos de la tienda (48 h tras desinstalar).
 *
 * ShopGenius AI no guarda datos personales de clientes finales (solo
 * productos, contenido generado y ajustes de la tienda), así que los dos
 * primeros se confirman con 200 y dejan traza. shop/redact elimina todo.
 *
 * `authenticate.webhook` valida la firma HMAC y responde 401 si no es válida.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  const compliance = toComplianceTopic(topic);

  switch (compliance) {
    case "CUSTOMERS_DATA_REQUEST":
      console.log(`[GDPR] ${topic} para ${shop}: no se almacenan datos de clientes; nada que exportar.`);
      break;
    case "CUSTOMERS_REDACT":
      console.log(`[GDPR] ${topic} para ${shop}: no se almacenan datos de clientes; nada que borrar.`);
      break;
    case "SHOP_REDACT":
      console.log(`[GDPR] ${topic} para ${shop}: borrando todos los datos de la tienda.`);
      await db.$transaction([
        db.generation.deleteMany({ where: { shop } }),
        db.shopSettings.deleteMany({ where: { shop } }),
        db.session.deleteMany({ where: { shop } }),
      ]);
      break;
    default:
      console.warn(`[webhook] Topic no gestionado en /webhooks/compliance: ${topic}`);
  }

  return new Response(null, { status: 200 });
};
