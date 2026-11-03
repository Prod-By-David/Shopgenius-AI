import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { PROVIDER_ENV_KEYS, PROVIDER_LABELS } from "../services/ai-providers";
import { isProviderId } from "../services/ai.server";
import { LANGUAGES, TONES } from "../services/ai-core";
import { isEncryptionConfigured } from "../services/crypto.server";
import { getShopQuota, getShopSettings, updateShopSettings } from "../services/shop.server";

const PROVIDERS = ["demo", "openai", "anthropic", "openrouter", "qwen"] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);

  return {
    settings: {
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel ?? "",
      hasApiKey: Boolean(settings.aiApiKeyEnc),
      defaultTone: settings.defaultTone,
      defaultLanguage: settings.defaultLanguage,
      defaultKeywords: settings.defaultKeywords ?? "",
      brandVoice: settings.brandVoice ?? "",
      storeDescription: settings.storeDescription ?? "",
    },
    encryptionConfigured: isEncryptionConfigured(),
    envKeyAvailable: PROVIDER_ENV_KEYS,
    quota: { planName: quota.plan.name, remaining: quota.remaining, limit: quota.limit },
  };
};

type SettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export const action = async ({ request }: ActionFunctionArgs): Promise<SettingsResult> => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const aiProvider = String(formData.get("aiProvider") ?? "demo");
  if (!isProviderId(aiProvider)) {
    return { ok: false, error: "Proveedor de IA no válido." };
  }

  const apiKey = formData.get("apiKey");
  const clearKey = formData.get("clearKey") === "true";

  try {
    await updateShopSettings(shop, {
      aiProvider,
      aiModel: String(formData.get("aiModel") ?? "").trim() || null,
      apiKey: clearKey ? null : typeof apiKey === "string" && apiKey.trim() ? apiKey : undefined,
      defaultTone: String(formData.get("defaultTone") ?? "profesional"),
      defaultLanguage: String(formData.get("defaultLanguage") ?? "es"),
      defaultKeywords: String(formData.get("defaultKeywords") ?? "").trim() || null,
      brandVoice: String(formData.get("brandVoice") ?? "").trim() || null,
      storeDescription: String(formData.get("storeDescription") ?? "").trim() || null,
    });
    return { ok: true };
  } catch (error) {
    console.error("Error guardando ajustes", error);
    return { ok: false, error: "No se pudieron guardar los ajustes." };
  }
};

export default function SettingsPage() {
  const { settings, encryptionConfigured, envKeyAvailable, quota } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<SettingsResult>();
  const shopify = useAppBridge();

  const [aiProvider, setAiProvider] = useState(settings.aiProvider);
  const [aiModel, setAiModel] = useState(settings.aiModel);
  const [apiKey, setApiKey] = useState("");
  const [defaultTone, setDefaultTone] = useState(settings.defaultTone);
  const [defaultLanguage, setDefaultLanguage] = useState(settings.defaultLanguage);
  const [defaultKeywords, setDefaultKeywords] = useState(settings.defaultKeywords);
  const [brandVoice, setBrandVoice] = useState(settings.brandVoice);
  const [storeDescription, setStoreDescription] = useState(settings.storeDescription);

  const saving = fetcher.state !== "idle";
  const data = fetcher.data;
  const error = data && !data.ok ? data : null;

  useEffect(() => {
    if (data?.ok) shopify.toast.show("Ajustes guardados");
    if (error) shopify.toast.show(error.error, { isError: true });
  }, [data, error, shopify]);

  return (
    <Page title="Ajustes" subtitle="Configura tu motor de IA y la voz de tu marca">
      <TitleBar title="Ajustes" />
      <BlockStack gap="400">
        {data?.ok && (
          <Banner tone="success" title="Ajustes guardados">
            <p>Los cambios se aplicarán en la próxima generación.</p>
          </Banner>
        )}
        {error && (
          <Banner tone="critical" title="Error al guardar">
            <p>{error.error}</p>
          </Banner>
        )}
        {!encryptionConfigured && (
          <Banner tone="warning" title="Cifrado no configurado">
            <p>
              Define APP_ENCRYPTION_KEY en el servidor para cifrar las API keys de
              tus comerciantes. Sin ella, las claves se guardan tal cual en la base
              de datos.
            </p>
          </Banner>
        )}

        <fetcher.Form method="post">
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Motor de IA
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Elige el proveedor que generará el contenido. Puedes usar la
                      clave global del servidor o guardar una clave específica para
                      esta tienda.
                    </Text>
                    <Divider />
                    <FormLayout>
                      <Select
                        label="Proveedor"
                        name="aiProvider"
                        options={PROVIDERS.map((provider) => ({
                          label: PROVIDER_LABELS[provider],
                          value: provider,
                        }))}
                        value={aiProvider}
                        onChange={setAiProvider}
                        helpText={
                          aiProvider === "demo"
                            ? "Modo demo: contenido de ejemplo, sin llamadas externas ni coste."
                            : `También puedes definir ${envKeyAvailable[aiProvider as keyof typeof envKeyAvailable] ?? "la API key"} en el servidor.`
                        }
                      />
                      <TextField
                        label="Modelo (opcional)"
                        name="aiModel"
                        value={aiModel}
                        onChange={setAiModel}
                        autoComplete="off"
                        placeholder={
                          aiProvider === "openai"
                            ? "gpt-4o-mini"
                            : aiProvider === "anthropic"
                              ? "claude-3-5-sonnet-latest"
                              : aiProvider === "qwen"
                                ? "qwen-plus"
                                : aiProvider === "openrouter"
                                  ? "qwen/qwen-2.5-72b-instruct"
                                  : "demo-v1"
                        }
                        helpText="Si lo dejas vacío se usa el modelo por defecto del proveedor."
                      />
                      <TextField
                        label="API key de la tienda"
                        name="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={setApiKey}
                        autoComplete="off"
                        placeholder={settings.hasApiKey ? "•••••••• (guardada)" : "sk-…"}
                        helpText={
                          settings.hasApiKey
                            ? "Ya hay una clave guardada. Escribe una nueva solo si quieres reemplazarla."
                            : "Se guarda cifrada y nunca se muestra de nuevo."
                        }
                      />
                      {settings.hasApiKey && (
                        <InlineStack gap="200" blockAlign="center">
                          <input type="hidden" name="clearKey" value="false" />
                          <Text as="span" variant="bodySm" tone="subdued">
                            ¿Quieres eliminar la clave guardada?
                          </Text>
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => {
                              const form = new FormData();
                              form.set("aiProvider", aiProvider);
                              form.set("clearKey", "true");
                              form.set("defaultTone", defaultTone);
                              form.set("defaultLanguage", defaultLanguage);
                              form.set("brandVoice", brandVoice);
                              form.set("storeDescription", storeDescription);
                              form.set("defaultKeywords", defaultKeywords);
                              fetcher.submit(form, { method: "post" });
                            }}
                          >
                            Eliminar clave
                          </Button>
                        </InlineStack>
                      )}
                    </FormLayout>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Voz de marca
                    </Text>
                    <FormLayout>
                      <FormLayout.Group>
                        <Select
                          label="Tono por defecto"
                          name="defaultTone"
                          options={TONES.map((tone) => ({ label: tone, value: tone }))}
                          value={defaultTone}
                          onChange={setDefaultTone}
                        />
                        <Select
                          label="Idioma por defecto"
                          name="defaultLanguage"
                          options={LANGUAGES.map((language) => ({
                            label: language.label,
                            value: language.code,
                          }))}
                          value={defaultLanguage}
                          onChange={setDefaultLanguage}
                        />
                      </FormLayout.Group>
                      <TextField
                        label="Palabras clave habituales"
                        name="defaultKeywords"
                        value={defaultKeywords}
                        onChange={setDefaultKeywords}
                        autoComplete="off"
                        helpText="Separadas por comas. Se usarán como base si el producto no tiene etiquetas."
                      />
                      <TextField
                        label="Guía de voz de marca"
                        name="brandVoice"
                        value={brandVoice}
                        onChange={setBrandVoice}
                        autoComplete="off"
                        multiline={3}
                        helpText="Ej: cercana pero experta, tutea, evita superlativos, menciona sostenibilidad."
                      />
                      <TextField
                        label="Descripción de la tienda"
                        name="storeDescription"
                        value={storeDescription}
                        onChange={setStoreDescription}
                        autoComplete="off"
                        multiline={2}
                        helpText="Contexto que la IA usará para alinear el contenido con tu negocio."
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Tu uso
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Plan {quota.planName}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {quota.remaining} de {quota.limit} generaciones disponibles
                      este mes.
                    </Text>
                    <Button url="/app/billing" variant="plain">
                      Cambiar de plan
                    </Button>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Proveedores soportados
                    </Text>
                    <Text as="p" variant="bodySm">
                      · OpenAI (GPT-4o mini y superiores)
                    </Text>
                    <Text as="p" variant="bodySm">
                      · Anthropic Claude 3.5 / 4
                    </Text>
                    <Text as="p" variant="bodySm">
                      · Qwen (DashScope internacional)
                    </Text>
                    <Text as="p" variant="bodySm">
                      · OpenRouter (Qwen, Llama, Mistral…)
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Coste estimado
                    </Text>
                    <Text as="p" variant="bodySm">
                      Una generación completa consume ~1.500 tokens de entrada y
                      ~700 de salida. Con gpt-4o-mini el coste medio es inferior a
                      0,001 € por producto.
                    </Text>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>

          <Box paddingBlockStart="400">
            <InlineStack align="end">
              <Button variant="primary" submit loading={saving}>
                Guardar ajustes
              </Button>
            </InlineStack>
          </Box>
        </fetcher.Form>
      </BlockStack>
    </Page>
  );
}
