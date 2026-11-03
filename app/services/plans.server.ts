/**
 * Catálogo de planes de suscripción (Shopify Billing API).
 * Se factura en EUR con recurrencia cada 30 días, gestionado por Shopify.
 * Este módulo es puro (sin dependencias de servidor) para poder testearlo.
 */

export type PlanId = "FREE" | "STARTER" | "PRO" | "SCALE";

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
    tagline: "Prueba la IA en tu tienda sin coste",
    features: [
      "10 generaciones de IA al mes",
      "Descripciones + metadatos SEO",
      "Alt text para imágenes",
      "Historial de 30 días",
    ],
  },
  STARTER: {
    id: "STARTER",
    billingName: "ShopGenius Starter",
    name: "Starter",
    price: 19,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 150,
    tagline: "Para tiendas que empiezan a escalar catálogo",
    features: [
      "150 generaciones de IA al mes",
      "Generación masiva (hasta 5 productos por lote)",
      "Auditoría SEO de la tienda",
      "Tono de marca personalizado",
      "Soporte por email",
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
    tagline: "El plan recomendado para vender más con menos trabajo",
    features: [
      "500 generaciones de IA al mes",
      "Generación masiva (hasta 10 productos por lote)",
      "Recomendaciones cruzadas (cross-sell) con IA",
      "Auditoría SEO + aplicación en un clic",
      "7 días de prueba gratuita",
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
    tagline: "Para catálogos grandes y agencias",
    features: [
      "2.000 generaciones de IA al mes",
      "Lotes de hasta 20 productos",
      "Multi-idioma avanzado",
      "Recomendaciones cruzadas ilimitadas",
      "Onboarding guiado y soporte prioritario",
    ],
  },
};

export const PLAN_IDS: PlanId[] = ["FREE", "STARTER", "PRO", "SCALE"];

/** Planes que se envían a la Billing API (todos los de pago). */
export const BILLABLE_PLAN_IDS: PlanId[] = ["STARTER", "PRO", "SCALE"];

export const DEFAULT_PLAN: PlanId = "FREE";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
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
