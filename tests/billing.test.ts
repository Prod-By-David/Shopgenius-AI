import { describe, expect, it } from "vitest";

import {
  BillingError,
  buildBillingReturnUrl,
  buildCreateSubscriptionVariables,
  cancelSubscriptionRequest,
  fetchActiveSubscriptions,
  friendlyBillingMessage,
  pickActiveSubscription,
  requestSubscription,
  type AppSubscriptionSummary,
  type GraphqlClient,
} from "../app/services/billing-core";
import { PLANS } from "../app/services/plans.server";

function fakeClient(responses: unknown[]) {
  const calls: Array<{ query: string; variables?: Record<string, unknown> }> = [];
  const queue = [...responses];
  const client: GraphqlClient = {
    graphql: async (query, options) => {
      calls.push({ query, variables: options?.variables });
      const next = queue.shift();
      return { json: async () => next } as unknown as Response;
    },
  };
  return { client, calls };
}

const RETURN_URL = "https://admin.shopify.com/store/demo/apps/key/app/billing";

describe("buildCreateSubscriptionVariables", () => {
  it("Pro = 49 EUR cada 30 días con el nombre de billing del plan", () => {
    const variables = buildCreateSubscriptionVariables(PLANS.PRO, { returnUrl: RETURN_URL, test: true });
    expect(variables.name).toBe("ShopGenius Pro");
    expect(variables.returnUrl).toBe(RETURN_URL);
    expect(variables.test).toBe(true);
    expect(variables.trialDays).toBeNull();
    expect(variables.lineItems).toEqual([
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: 49, currencyCode: "EUR" },
            interval: "EVERY_30_DAYS",
          },
        },
      },
    ]);
  });

  it("incluye los días de prueba solo si son > 0", () => {
    expect(
      buildCreateSubscriptionVariables(PLANS.PRO, { returnUrl: RETURN_URL, test: true, trialDays: 7 }).trialDays,
    ).toBe(7);
    expect(
      buildCreateSubscriptionVariables(PLANS.PRO, { returnUrl: RETURN_URL, test: true, trialDays: 0 }).trialDays,
    ).toBeNull();
  });
});

describe("requestSubscription (appSubscriptionCreate)", () => {
  it("devuelve la URL de confirmación y envía el cargo como de prueba", async () => {
    const { client, calls } = fakeClient([
      {
        data: {
          appSubscriptionCreate: {
            appSubscription: { id: "gid://shopify/AppSubscription/1" },
            confirmationUrl: "https://admin.shopify.com/charges/confirm",
            userErrors: [],
          },
        },
      },
    ]);

    const result = await requestSubscription(client, "PRO", { returnUrl: RETURN_URL, test: true });

    expect(result.confirmationUrl).toBe("https://admin.shopify.com/charges/confirm");
    expect(result.subscriptionId).toBe("gid://shopify/AppSubscription/1");
    expect(calls).toHaveLength(1);
    expect(calls[0].query).toContain("appSubscriptionCreate");
    expect(calls[0].variables?.test).toBe(true);
    expect(calls[0].variables?.name).toBe("ShopGenius Pro");
  });

  it("rechaza el plan Free (no es de pago) sin llamar a Shopify", async () => {
    const { client, calls } = fakeClient([]);
    await expect(
      requestSubscription(client, "FREE", { returnUrl: RETURN_URL, test: true }),
    ).rejects.toBeInstanceOf(BillingError);
    expect(calls).toHaveLength(0);
  });

  it("propaga los userErrors de Shopify", async () => {
    const { client } = fakeClient([
      {
        data: {
          appSubscriptionCreate: {
            appSubscription: null,
            confirmationUrl: null,
            userErrors: [{ field: ["name"], message: "Nombre no válido" }],
          },
        },
      },
    ]);
    await expect(
      requestSubscription(client, "SCALE", { returnUrl: RETURN_URL, test: true }),
    ).rejects.toThrow("Nombre no válido");
  });

  it("falla si Shopify no devuelve URL de confirmación", async () => {
    const { client } = fakeClient([
      { data: { appSubscriptionCreate: { appSubscription: null, confirmationUrl: null, userErrors: [] } } },
    ]);
    await expect(
      requestSubscription(client, "PRO", { returnUrl: RETURN_URL, test: true }),
    ).rejects.toThrow("URL de confirmación");
  });

  it("convierte los errores GraphQL en BillingError", async () => {
    const { client } = fakeClient([{ errors: [{ message: "Access denied" }] }]);
    await expect(
      requestSubscription(client, "PRO", { returnUrl: RETURN_URL, test: true }),
    ).rejects.toThrow("Access denied");
  });
});

describe("fetchActiveSubscriptions / pickActiveSubscription", () => {
  const sub = (overrides: Partial<AppSubscriptionSummary>): AppSubscriptionSummary => ({
    id: "gid://shopify/AppSubscription/1",
    name: "ShopGenius Pro",
    status: "ACTIVE",
    test: true,
    currentPeriodEnd: null,
    ...overrides,
  });

  it("lee las suscripciones activas de la instalación", async () => {
    const { client, calls } = fakeClient([
      {
        data: {
          currentAppInstallation: {
            activeSubscriptions: [
              { id: "gid://shopify/AppSubscription/9", name: "ShopGenius Pro", status: "ACTIVE", test: true },
            ],
          },
        },
      },
    ]);
    const subs = await fetchActiveSubscriptions(client);
    expect(calls[0].query).toContain("activeSubscriptions");
    expect(subs).toEqual([
      {
        id: "gid://shopify/AppSubscription/9",
        name: "ShopGenius Pro",
        status: "ACTIVE",
        test: true,
        currentPeriodEnd: null,
      },
    ]);
  });

  it("sin suscripciones devuelve una lista vacía", async () => {
    const { client } = fakeClient([{ data: { currentAppInstallation: { activeSubscriptions: [] } } }]);
    expect(await fetchActiveSubscriptions(client)).toEqual([]);
  });

  it("en modo prueba acepta cargos de prueba", () => {
    const match = pickActiveSubscription([sub({ test: true })], { testMode: true });
    expect(match?.plan.id).toBe("PRO");
  });

  it("en modo real ignora los cargos de prueba", () => {
    expect(pickActiveSubscription([sub({ test: true })], { testMode: false })).toBeNull();
    expect(pickActiveSubscription([sub({ test: false })], { testMode: false })?.plan.id).toBe("PRO");
  });

  it("ignora suscripciones no activas o de planes desconocidos", () => {
    expect(pickActiveSubscription([sub({ status: "PENDING" })], { testMode: true })).toBeNull();
    expect(pickActiveSubscription([sub({ name: "Otra app" })], { testMode: true })).toBeNull();
    expect(pickActiveSubscription([sub({ name: "ShopGenius Free" })], { testMode: true })).toBeNull();
  });

  it("si hay varias gana el plan más caro", () => {
    const match = pickActiveSubscription(
      [
        sub({ id: "gid://shopify/AppSubscription/1", name: "ShopGenius Pro" }),
        sub({ id: "gid://shopify/AppSubscription/2", name: "ShopGenius Scale" }),
      ],
      { testMode: true },
    );
    expect(match?.plan.id).toBe("SCALE");
    expect(match?.subscription.id).toBe("gid://shopify/AppSubscription/2");
  });
});

describe("cancelSubscriptionRequest (appSubscriptionCancel)", () => {
  it("cancela por id", async () => {
    const { client, calls } = fakeClient([
      { data: { appSubscriptionCancel: { appSubscription: { id: "x", status: "CANCELLED" }, userErrors: [] } } },
    ]);
    await cancelSubscriptionRequest(client, "gid://shopify/AppSubscription/1");
    expect(calls[0].query).toContain("appSubscriptionCancel");
    expect(calls[0].variables).toEqual({ id: "gid://shopify/AppSubscription/1" });
  });

  it("lanza BillingError con los userErrors", async () => {
    const { client } = fakeClient([
      { data: { appSubscriptionCancel: { appSubscription: null, userErrors: [{ message: "Ya cancelada" }] } } },
    ]);
    await expect(cancelSubscriptionRequest(client, "gid://shopify/AppSubscription/1")).rejects.toThrow(
      "Ya cancelada",
    );
  });
});

describe("buildBillingReturnUrl", () => {
  it("devuelve a la app embebida dentro del admin de Shopify", () => {
    expect(
      buildBillingReturnUrl({ shop: "mi-tienda.myshopify.com", apiKey: "abc123", appUrl: "https://app.example.com" }),
    ).toBe("https://admin.shopify.com/store/mi-tienda/apps/abc123/app/billing");
  });

  it("sin api key usa la URL pública de la app", () => {
    expect(
      buildBillingReturnUrl({ shop: "mi-tienda.myshopify.com", apiKey: "", appUrl: "https://app.example.com/" }),
    ).toBe("https://app.example.com/app/billing");
  });

  it("un dominio no válido no se inyecta en la URL del admin", () => {
    expect(
      buildBillingReturnUrl({ shop: "evil.com/x", apiKey: "abc", appUrl: "https://app.example.com" }),
    ).toBe("https://app.example.com/app/billing");
  });
});

describe("mensajes de error de Shopify", () => {
  it("explica el error de distribución no pública con la acción a seguir", () => {
    const message = friendlyBillingMessage("Apps without a public distribution cannot use the Billing API");
    expect(message).toContain("Distribución pública");
    expect(message).toContain("Apps without a public distribution");
  });

  it("deja intactos los demás mensajes", () => {
    expect(friendlyBillingMessage("Access denied")).toBe("Access denied");
  });

  it("requestSubscription lanza el mensaje amigable cuando la app no es pública", async () => {
    const { client } = fakeClient([
      { errors: [{ message: "Custom apps cannot use the Billing API" }] },
    ]);
    await expect(
      requestSubscription(client, "PRO", { returnUrl: RETURN_URL, test: true }),
    ).rejects.toThrow("Distribución pública");
  });
});

