/**
 * Lógica pura de webhooks (sin Prisma ni Shopify) para poder testearla.
 */
import { getPlanByBillingName, type PlanId } from "./plans.server";

/**
 * Normaliza un topic de webhook al formato `SHOP_REDACT`.
 * Acepta `shop/redact`, `SHOP_REDACT` y `shop.redact`.
 */
export function normalizeWebhookTopic(topic: string | null | undefined): string {
  return (topic ?? "")
    .trim()
    .replace(/[/.\-\s]+/g, "_")
    .toUpperCase();
}

export type ComplianceTopic = "CUSTOMERS_DATA_REQUEST" | "CUSTOMERS_REDACT" | "SHOP_REDACT";

const COMPLIANCE_TOPICS: readonly ComplianceTopic[] = [
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
];

/** Devuelve el topic de cumplimiento normalizado o `null` si no lo es. */
export function toComplianceTopic(topic: string | null | undefined): ComplianceTopic | null {
  const normalized = normalizeWebhookTopic(topic);
  return COMPLIANCE_TOPICS.find((item) => item === normalized) ?? null;
}

/** Estados de una suscripción que implican que ya no está vigente. */
export const INACTIVE_SUBSCRIPTION_STATUSES = ["CANCELLED", "EXPIRED", "DECLINED", "FROZEN"] as const;

export type SubscriptionUpdateDecision =
  | { action: "set-plan"; planId: PlanId; subscriptionId: string | null; status: string }
  | { action: "downgrade"; status: string }
  | { action: "ignore"; reason: string };

/**
 * Decide qué hacer con un webhook `app_subscriptions/update`.
 *
 * - Solo una suscripción ACTIVE de un plan conocido concede el plan
 *   (PENDING = aún sin aprobar, no concede nada).
 * - Un evento "inactivo" solo degrada a FREE si corresponde a la suscripción
 *   guardada; el aviso de CANCELLED de una suscripción anterior (p. ej. al
 *   cambiar de PRO a SCALE) no debe tumbar el plan nuevo.
 */
export function resolveSubscriptionUpdate(input: {
  status?: string | null;
  name?: string | null;
  incomingId?: string | null;
  storedId?: string | null;
}): SubscriptionUpdateDecision {
  const status = (input.status ?? "").trim().toUpperCase();
  const incomingId = input.incomingId ?? null;
  const storedId = input.storedId ?? null;

  if ((INACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    if (storedId && incomingId && storedId !== incomingId) {
      return { action: "ignore", reason: "evento de una suscripción anterior" };
    }
    return { action: "downgrade", status };
  }

  if (status === "ACTIVE") {
    const plan = getPlanByBillingName(input.name);
    if (!plan || plan.id === "FREE") {
      return { action: "ignore", reason: "suscripción activa de un plan desconocido" };
    }
    return { action: "set-plan", planId: plan.id, subscriptionId: incomingId, status };
  }

  return { action: "ignore", reason: `estado ${status || "desconocido"} sin efecto` };
}
