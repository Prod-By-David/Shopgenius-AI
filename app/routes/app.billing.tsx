import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  Layout,
  List,
  Page,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  BILLING_TEST_MODE,
  cancelSubscription,
  createSubscription,
  syncBillingState,
  type BillingClient,
} from "../services/billing.server";
import { PLANS, PLAN_IDS, type PlanId } from "../services/plans.server";
import { getShopQuota, getShopSettings, setShopPlan } from "../services/shop.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await getShopSettings(shop);
  const state = await syncBillingState(shop, billing as unknown as BillingClient);
  const quota = await getShopQuota(shop);

  return {
    currentPlan: state.planId,
    active: state.active,
    test: state.test,
    subscriptionStatus: state.subscription?.status ?? settings.subscriptionStatus ?? "NONE",
    testMode: BILLING_TEST_MODE,
    usage: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      percent: quota.percent,
      planName: quota.plan.name,
    },
    plans: PLAN_IDS.map((id) => PLANS[id]),
  };
};

type BillingActionResult =
  | { ok: true; intent: "subscribe"; confirmationUrl: string }
  | { ok: true; intent: "cancel" | "sync" }
  | { ok: false; error: string };

export const action = async ({ request }: ActionFunctionArgs): Promise<BillingActionResult> => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "sync");

  try {
    if (intent === "subscribe") {
      const planId = String(formData.get("planId") ?? "") as PlanId;
      if (!PLAN_IDS.includes(planId) || planId === "FREE") {
        return { ok: false, error: "Plan no válido." };
      }
      const returnUrl = new URL("/app/billing", process.env.SHOPIFY_APP_URL ?? "https://localhost").toString();
      const confirmationUrl = await createSubscription(
        billing as unknown as BillingClient,
        planId,
        returnUrl,
      );
      if (!confirmationUrl) {
        return { ok: false, error: "Shopify no devolvió una URL de confirmación." };
      }
      return { ok: true, intent: "subscribe", confirmationUrl };
    }

    if (intent === "cancel") {
      const settings = await getShopSettings(shop);
      const state = await syncBillingState(shop, billing as unknown as BillingClient);
      const subscriptionId = state.subscription?.id ?? settings.subscriptionId;
      const result = await cancelSubscription(admin, subscriptionId);
      if (!result.ok) return { ok: false, error: result.error ?? "No se pudo cancelar." };
      await setShopPlan(shop, "FREE", { status: "CANCELLED" });
      return { ok: true, intent: "cancel" };
    }

    await syncBillingState(shop, billing as unknown as BillingClient);
    return { ok: true, intent: "sync" };
  } catch (error) {
    console.error("Error de facturación", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado de facturación.",
    };
  }
};

export default function BillingPage() {
  const { plans, currentPlan, active, test, testMode, usage, subscriptionStatus } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<BillingActionResult>();
  const shopify = useAppBridge();

  const data = fetcher.data;
  const error = data && !data.ok ? data : null;
  const subscribingPlan =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "subscribe"
      ? String(fetcher.formData.get("planId") ?? "")
      : "";
  const cancelling = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "cancel";

  useEffect(() => {
    if (data?.ok && data.intent === "subscribe") {
      window.open(data.confirmationUrl, "_top");
    }
  }, [data]);

  useEffect(() => {
    if (data?.ok && data.intent === "cancel") {
      shopify.toast.show("Suscripción cancelada. Sigues en el plan Free.");
    }
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [data, error, shopify]);

  return (
    <Page title="Plan y facturación" subtitle="Suscripción gestionada de forma segura por Shopify">
      <TitleBar title="Plan y facturación" />
      <BlockStack gap="400">
        {testMode && (
          <Banner tone="warning" title="Facturación en modo test">
            <p>
              Los cargos se simulan. Desactiva BILLING_TEST_MODE antes de enviar
              la app a revisión para que los comerciantes paguen de verdad.
            </p>
          </Banner>
        )}
        {error && (
          <Banner tone="critical" title="No se pudo completar la operación">
            <p>{error.error}</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <BlockStack gap="050">
                    <Text as="h2" variant="headingMd">
                      Plan actual: {usage.planName}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Estado de la suscripción: {subscriptionStatus}
                      {active ? " · Activa en Shopify" : " · Sin cargo activo"}
                    </Text>
                  </BlockStack>
                  <InlineStack gap="200">
                    {test && <Badge tone="attention">Entorno test</Badge>}
                    <Badge tone={currentPlan === "FREE" ? undefined : "success"}>
                      {currentPlan}
                    </Badge>
                  </InlineStack>
                </InlineStack>
                <Divider />
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Generaciones este mes
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {usage.used} / {usage.limit}
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={usage.percent} tone={usage.percent >= 90 ? "critical" : "primary"} />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Quedan {usage.remaining} generaciones en tu ciclo actual.
                  </Text>
                </BlockStack>
                {currentPlan !== "FREE" && (
                  <InlineStack gap="200">
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="cancel" />
                      <Button submit tone="critical" loading={cancelling}>
                        Cancelar suscripción
                      </Button>
                    </fetcher.Form>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="sync" />
                      <Button submit>Actualizar estado</Button>
                    </fetcher.Form>
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Cómo funciona el cobro
                </Text>
                <Text as="p" variant="bodySm">
                  Shopify solicita tu aprobación y cobra en tu moneda de
                  facturación. Puedes cancelar cuando quieras desde esta pantalla
                  o desde tu admin de Shopify.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Facturación en EUR · ciclo de 30 días · sin contratos.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Card key={plan.id}>
                <BlockStack gap="300">
                  <BlockStack gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingMd">
                        {plan.name}
                      </Text>
                      {plan.recommended && <Badge tone="success">Recomendado</Badge>}
                      {isCurrent && !plan.recommended && <Badge>Actual</Badge>}
                    </InlineStack>
                    <Text as="p" variant="headingLg">
                      {plan.price === 0 ? "Gratis" : `${plan.price} €`}
                      {plan.price > 0 && (
                        <Text as="span" variant="bodySm" tone="subdued">
                          {" "}/mes
                        </Text>
                      )}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {plan.tagline}
                    </Text>
                  </BlockStack>
                  <Divider />
                  <List type="bullet">
                    {plan.features.map((feature) => (
                      <List.Item key={feature}>{feature}</List.Item>
                    ))}
                  </List>
                  <Box>
                    {plan.id === "FREE" ? (
                      isCurrent || !active ? (
                        <Button fullWidth disabled={isCurrent} url="/app">
                          {isCurrent ? "Plan actual" : "Usar plan Free"}
                        </Button>
                      ) : (
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="cancel" />
                          <Button fullWidth submit loading={cancelling}>
                            Cambiar al plan Free
                          </Button>
                        </fetcher.Form>
                      )
                    ) : (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="subscribe" />
                        <input type="hidden" name="planId" value={plan.id} />
                        <Button
                          fullWidth
                          variant={plan.recommended ? "primary" : "secondary"}
                          submit
                          disabled={isCurrent}
                          loading={subscribingPlan === plan.id}
                        >
                          {isCurrent ? "Plan actual" : `Elegir ${plan.name}`}
                        </Button>
                      </fetcher.Form>
                    )}
                  </Box>
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
