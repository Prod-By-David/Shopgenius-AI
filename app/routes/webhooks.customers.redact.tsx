import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Redacción de datos de un cliente concreto.
 * No guardamos información de clientes finales, así que no hay nada que borrar.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop}: sin datos de clientes almacenados.`);
  await db.generation.count({ where: { shop } });
  return new Response(null, { status: 200 });
};
