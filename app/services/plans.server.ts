/**
 * Catálogo de planes de suscripción (Shopify Billing API).
 * Se factura en EUR con recurrencia cada 30 días, gestionado por Shopify.
 *
 * Plan de pago de referencia: Pro, 49 €/mes ("desde 49 €/mes" del
 * planteamiento). Existe además un plan Free limitado para probar la app y un
 * plan Scale superior para catálogos grandes.
 *
 * Este módulo es puro (sin dependencias de servidor) para poder testearlo.
 */

export type PlanId = "FREE" | "PRO" | "SCALE";

export interface Plan {
  id: PlanId;
  /** Nombre exacto que se envía a la Billing API. No cambiar sin migración. */
  billingName: string;
  name: string;
  price: number;
  currency: "EUR";
  interval: "EVERY_30_DAYS";
  /** Generaciones de IA incluidas al mes. */
  generationLimit: number;
  /** Máximo de productos por lote en la generación masiva. */
  batchLimit: number;
  tagline: string;
  features: string[];
  recommended?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    billingName: "ShopGenius Free",
    name: "Free",
    price: 0,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 10,
    batchLimit: 3,
    tagline: "Prueba la IA en tu tienda sin coste",
    features: [
      "10 generaciones de IA al mes",
      "Descripciones, metadatos SEO, etiquetas y alt text",
      "Generación masiva (hasta 3 productos por lote)",
      "Auditoría SEO y recomendaciones cruzadas",
    ],
  },
  PRO: {
    id: "PRO",
    billingName: "ShopGenius Pro",
    name: "Pro",
    price: 49,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 500,
    batchLimit: 10,
    tagline: "El plan recomendado para vender más con menos trabajo",
    features: [
      "500 generaciones de IA al mes",
      "Generación masiva (hasta 10 productos por lote)",
      "Recomendaciones cruzadas (cross-sell) con IA",
      "Auditoría SEO + corrección en un clic",
      "Soporte prioritario",
    ],
    recommended: true,
  },
  SCALE: {
    id: "SCALE",
    billingName: "ShopGenius Scale",
    name: "Scale",
    price: 99,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 2000,
    batchLimit: 20,
    tagline: "Para catálogos grandes y agencias",
    features: [
      "2.000 generaciones de IA al mes",
      "Lotes de hasta 20 productos",
      "Todas las funciones del plan Pro",
      "Soporte prioritario",
    ],
  },
};

export const PLAN_IDS: PlanId[] = ["FREE", "PRO", "SCALE"];

/** Planes que se envían a la Billing API (todos los de pago). */
export const BILLABLE_PLAN_IDS: PlanId[] = ["PRO", "SCALE"];

export const DEFAULT_PLAN: PlanId = "FREE";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

export function isBillablePlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (BILLABLE_PLAN_IDS as string[]).includes(value);
}

export function getPlan(id: string | null | undefined): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS[DEFAULT_PLAN];
}

export function getPlanByBillingName(name: string | null | undefined): Plan | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return (
    PLAN_IDS.map((id) => PLANS[id]).find(
      (plan) => plan.billingName.toLowerCase() === normalized,
    ) ?? null
  );
}

export function getBatchLimit(id: string | null | undefined): number {
  return getPlan(id).batchLimit;
}

export function formatPrice(plan: Plan): string {
  if (plan.price === 0) return "Gratis";
  return `${plan.price} €/mes`;
}

/** Límite mensual aplicando un override manual por tienda. */
export function resolveGenerationLimit(
  plan: Plan,
  override?: number | null,
): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  return plan.generationLimit;
}

export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function hasGenerationQuota(used: number, limit: number): boolean {
  return used < limit;
}

/** Fecha de inicio del ciclo mensual natural (mes UTC). */
export function currentPeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
