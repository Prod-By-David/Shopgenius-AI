import { describe, expect, it } from "vitest";

import {
  normalizeWebhookTopic,
  resolveSubscriptionUpdate,
  toComplianceTopic,
} from "../app/services/webhook-logic";

describe("topics de webhooks", () => {
  it("normaliza los distintos formatos de topic", () => {
    expect(normalizeWebhookTopic("shop/redact")).toBe("SHOP_REDACT");
    expect(normalizeWebhookTopic("SHOP_REDACT")).toBe("SHOP_REDACT");
    expect(normalizeWebhookTopic("customers/data_request")).toBe("CUSTOMERS_DATA_REQUEST");
    expect(normalizeWebhookTopic("app_subscriptions/update")).toBe("APP_SUBSCRIPTIONS_UPDATE");
    expect(normalizeWebhookTopic(undefined)).toBe("");
  });

  it("reconoce solo los tres topics obligatorios de privacidad", () => {
    expect(toComplianceTopic("customers/data_request")).toBe("CUSTOMERS_DATA_REQUEST");
    expect(toComplianceTopic("CUSTOMERS_REDACT")).toBe("CUSTOMERS_REDACT");
    expect(toComplianceTopic("shop/redact")).toBe("SHOP_REDACT");
    expect(toComplianceTopic("app/uninstalled")).toBeNull();
    expect(toComplianceTopic(null)).toBeNull();
  });
});

describe("resolveSubscriptionUpdate (app_subscriptions/update)", () => {
  const PRO_ID = "gid://shopify/AppSubscription/1";
  const SCALE_ID = "gid://shopify/AppSubscription/2";

  it("ACTIVE de un plan conocido concede el plan", () => {
    expect(
      resolveSubscriptionUpdate({ status: "ACTIVE", name: "ShopGenius Pro", incomingId: PRO_ID, storedId: null }),
    ).toEqual({ action: "set-plan", planId: "PRO", subscriptionId: PRO_ID, status: "ACTIVE" });
  });

  it("PENDING no concede el plan (aún sin aprobar)", () => {
    expect(
      resolveSubscriptionUpdate({ status: "PENDING", name: "ShopGenius Pro", incomingId: PRO_ID, storedId: null }).action,
    ).toBe("ignore");
  });

  it("ACTIVE de un nombre desconocido se ignora", () => {
    expect(
      resolveSubscriptionUpdate({ status: "ACTIVE", name: "Otra app", incomingId: PRO_ID, storedId: null }).action,
    ).toBe("ignore");
  });

  it("CANCELLED de la suscripción guardada degrada a Free", () => {
    expect(
      resolveSubscriptionUpdate({ status: "cancelled", name: "ShopGenius Pro", incomingId: PRO_ID, storedId: PRO_ID }),
    ).toEqual({ action: "downgrade", status: "CANCELLED" });
  });

  it("CANCELLED sin suscripción guardada también degrada", () => {
    expect(
      resolveSubscriptionUpdate({ status: "EXPIRED", name: "ShopGenius Pro", incomingId: PRO_ID, storedId: null }).action,
    ).toBe("downgrade");
  });

  it("el CANCELLED de una suscripción anterior no tumba el plan nuevo (Pro → Scale)", () => {
    expect(
      resolveSubscriptionUpdate({
        status: "CANCELLED",
        name: "ShopGenius Pro",
        incomingId: PRO_ID,
        storedId: SCALE_ID,
      }).action,
    ).toBe("ignore");
  });

  it("DECLINED y FROZEN degradan", () => {
    for (const status of ["DECLINED", "FROZEN"]) {
      expect(
        resolveSubscriptionUpdate({ status, name: "ShopGenius Pro", incomingId: PRO_ID, storedId: PRO_ID }).action,
      ).toBe("downgrade");
    }
  });
});
