import { describe, expect, it } from "vitest";

import {
  PLANS,
  currentPeriodStart,
  formatPrice,
  getPlan,
  getPlanByBillingName,
  hasGenerationQuota,
  resolveGenerationLimit,
  usagePercent,
} from "../app/services/plans.server";

describe("planes", () => {
  it("el plan Pro cuesta 49 €/mes y es el recomendado", () => {
    expect(PLANS.PRO.price).toBe(49);
    expect(PLANS.PRO.recommended).toBe(true);
    expect(formatPrice(PLANS.PRO)).toBe("49 €/mes");
    expect(formatPrice(PLANS.FREE)).toBe("Gratis");
  });

  it("los límites crecen con el plan", () => {
    expect(PLANS.FREE.generationLimit).toBeLessThan(PLANS.STARTER.generationLimit);
    expect(PLANS.STARTER.generationLimit).toBeLessThan(PLANS.PRO.generationLimit);
    expect(PLANS.PRO.generationLimit).toBeLessThan(PLANS.SCALE.generationLimit);
  });

  it("resuelve planes por id y por nombre de billing", () => {
    expect(getPlan("PRO").id).toBe("PRO");
    expect(getPlan("desconocido").id).toBe("FREE");
    expect(getPlanByBillingName("ShopGenius Pro")?.id).toBe("PRO");
    expect(getPlanByBillingName("shopgenius starter")?.id).toBe("STARTER");
    expect(getPlanByBillingName("otro")).toBeNull();
  });

  it("aplica overrides de límite y calculaS el porcentaje", () => {
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
