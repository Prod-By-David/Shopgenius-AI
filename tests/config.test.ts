import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHOPIFY_API_VERSION,
  resolveApiVersion,
  resolveAppMode,
  resolveBillingTestMode,
  resolveTrialDays,
} from "../app/config.server";

describe("modo prueba (APP_MODE / BILLING_TEST_MODE)", () => {
  it("por defecto el proyecto está en modo prueba con cargos de prueba", () => {
    expect(resolveAppMode({})).toBe("test");
    expect(resolveBillingTestMode({})).toBe(true);
  });

  it("los cargos reales exigen APP_MODE=live Y BILLING_TEST_MODE=false", () => {
    expect(resolveBillingTestMode({ APP_MODE: "live", BILLING_TEST_MODE: "false" })).toBe(false);
    expect(resolveBillingTestMode({ APP_MODE: " LIVE ", BILLING_TEST_MODE: "FALSE" })).toBe(false);
  });

  it("con cualquier otra combinación los cargos siguen siendo de prueba", () => {
    expect(resolveBillingTestMode({ APP_MODE: "live" })).toBe(true);
    expect(resolveBillingTestMode({ APP_MODE: "live", BILLING_TEST_MODE: "true" })).toBe(true);
    expect(resolveBillingTestMode({ BILLING_TEST_MODE: "false" })).toBe(true);
    expect(resolveBillingTestMode({ APP_MODE: "test", BILLING_TEST_MODE: "false" })).toBe(true);
    expect(resolveBillingTestMode({ APP_MODE: "produccion", BILLING_TEST_MODE: "false" })).toBe(true);
    expect(resolveBillingTestMode({ APP_MODE: "live", BILLING_TEST_MODE: "0" })).toBe(true);
  });

  it("APP_MODE desconocido cae a modo prueba", () => {
    expect(resolveAppMode({ APP_MODE: "prod" })).toBe("test");
    expect(resolveAppMode({ APP_MODE: "live" })).toBe("live");
  });
});

describe("días de prueba y versión de API", () => {
  it("BILLING_TRIAL_DAYS: 0 por defecto, acotado a 0–30", () => {
    expect(resolveTrialDays({})).toBe(0);
    expect(resolveTrialDays({ BILLING_TRIAL_DAYS: "7" })).toBe(7);
    expect(resolveTrialDays({ BILLING_TRIAL_DAYS: "99" })).toBe(30);
    expect(resolveTrialDays({ BILLING_TRIAL_DAYS: "-3" })).toBe(0);
    expect(resolveTrialDays({ BILLING_TRIAL_DAYS: "abc" })).toBe(0);
  });

  it("la versión de la Admin API es 2026-10 salvo override", () => {
    expect(DEFAULT_SHOPIFY_API_VERSION).toBe("2026-10");
    expect(resolveApiVersion({})).toBe("2026-10");
    expect(resolveApiVersion({ SHOPIFY_API_VERSION: " 2027-01 " })).toBe("2027-01");
    expect(resolveApiVersion({ SHOPIFY_API_VERSION: "" })).toBe("2026-10");
  });
});
