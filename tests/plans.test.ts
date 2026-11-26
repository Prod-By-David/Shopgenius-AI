import { describe, expect, it } from "vitest";

import {
  BILLABLE_PLAN_IDS,
  PLANS,
  PLAN_IDS,
  currentPeriodStart,
  formatPrice,
  getBatchLimit,
  getPlan,
  getPlanByBillingName,
  hasGenerationQuota,
  isBillablePlanId,
  isPlanId,
  resolveGenerationLimit,
  usagePercent,
} from "../app/services/plans.server";

describe("planes", () => {
  it("el plan Pro cuesta 49 €/mes (desde 49 €/mes) y es el recomendado", () => {
    expect(PLANS.PRO.price).toBe(49);
    expect(PLANS.PRO.currency).toBe("EUR");
    expect(PLANS.PRO.interval).toBe("EVERY_30_DAYS");
    expect(PLANS.PRO.recommended).toBe(true);
    expect(formatPrice(PLANS.PRO)).toBe("49 €/mes");
    expect(formatPrice(PLANS.FREE)).toBe("Gratis");
  });

  it("49 € es el precio de pago más bajo ('desde 49 €/mes')", () => {
    const paid = BILLABLE_PLAN_IDS.map((id) => PLANS[id].price);
    expect(Math.min(...paid)).toBe(49);
  });

  it("los límites crecen con el plan", () => {
    expect(PLANS.FREE.generationLimit).toBeLessThan(PLANS.PRO.generationLimit);
    expect(PLANS.PRO.generationLimit).toBeLessThan(PLANS.SCALE.generationLimit);
    expect(PLANS.FREE.batchLimit).toBeLessThan(PLANS.PRO.batchLimit);
    expect(PLANS.PRO.batchLimit).toBeLessThan(PLANS.SCALE.batchLimit);
  });

  it("solo los planes de pago se envían a la Billing API", () => {
    expect(PLAN_IDS).toEqual(["FREE", "PRO", "SCALE"]);
    expect(BILLABLE_PLAN_IDS).toEqual(["PRO", "SCALE"]);
    expect(isBillablePlanId("PRO")).toBe(true);
    expect(isBillablePlanId("FREE")).toBe(false);
    expect(isBillablePlanId("STARTER")).toBe(false);
    expect(isPlanId("SCALE")).toBe(true);
    expect(isPlanId("STARTER")).toBe(false);
  });

  it("resuelve planes por id y por nombre de billing", () => {
    expect(getPlan("PRO").id).toBe("PRO");
    expect(getPlan("desconocido").id).toBe("FREE");
    expect(getPlan(null).id).toBe("FREE");
    expect(getPlanByBillingName("ShopGenius Pro")?.id).toBe("PRO");
    expect(getPlanByBillingName("  shopgenius scale ")?.id).toBe("SCALE");
    expect(getPlanByBillingName("otro")).toBeNull();
    expect(getPlanByBillingName(undefined)).toBeNull();
  });

  it("los nombres de billing son únicos", () => {
    const names = PLAN_IDS.map((id) => PLANS[id].billingName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("el límite de lote depende del plan", () => {
    expect(getBatchLimit("FREE")).toBe(3);
    expect(getBatchLimit("PRO")).toBe(10);
    expect(getBatchLimit("SCALE")).toBe(20);
    expect(getBatchLimit("raro")).toBe(3);
  });

  it("aplica overrides de límite y calcula el porcentaje", () => {
    expect(resolveGenerationLimit(PLANS.PRO)).toBe(500);
    expect(resolveGenerationLimit(PLANS.PRO, 1000)).toBe(1000);
    expect(resolveGenerationLimit(PLANS.PRO, 0)).toBe(500);
    expect(usagePercent(250, 500)).toBe(50);
    expect(usagePercent(900, 500)).toBe(100);
    expect(hasGenerationQuota(499, 500)).toBe(true);
    expect(hasGenerationQuota(500, 500)).toBe(false);
  });

  it("el periodo empieza el día 1 del mes", () => {
    const start = currentPeriodStart(new Date("2026-03-17T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
