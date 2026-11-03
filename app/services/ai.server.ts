import {
  buildProductPrompt,
  buildRecommendationPrompt,
  demoRecommendations,
  generateDemoContent,
  parseAiContent,
  parseRecommendations,
  type AiProviderId,
  type CatalogItem,
  type GeneratedContent,
  type GenerationOptions,
  type ProductBrief,
  type RecommendationResult,
} from "./ai-core";

export class AiError extends Error {
  code: string;
  constructor(message: string, code = "AI_ERROR") {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface AiRuntimeConfig {
  provider: AiProviderId;
  model?: string | null;
  apiKey?: string | null;
  baseUrl?: string | null;
}

export interface AiResult {
  content: GeneratedContent;
  provider: AiProviderId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  demo: boolean;
}

export const PROVIDER_LABELS: Record<AiProviderId, string> = {
  demo: "Modo demo (sin coste)",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  openrouter: "OpenRouter (Qwen, Llama, etc.)",
  qwen: "Qwen (Alibaba DashScope)",
};

export const PROVIDER_ENV_KEYS: Record<Exclude<AiProviderId, "demo">, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  qwen: "QWEN_API_KEY",
};

const DEFAULT_MODELS: Record<Exclude<AiProviderId, "demo">, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  openrouter: "qwen/qwen-2.5-72b-instruct",
  qwen: "qwen-plus",
};

const OPENAI_COMPATIBLE_BASE_URLS: Record<"openai" | "openrouter" | "qwen", string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
};

const MAX_TOKENS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;

export function isProviderId(value: unknown): value is AiProviderId {
  return (
    value === "demo" ||
    value === "openai" ||
    value === "anthropic" ||
    value === "openrouter" ||
    value === "qwen"
  );
}

export function resolveApiKey(config: AiRuntimeConfig): string | null {
  if (config.apiKey && config.apiKey.trim()) return config.apiKey.trim();
  if (config.provider === "demo") return null;
  const envKey = process.env[PROVIDER_ENV_KEYS[config.provider]];
  return envKey && envKey.trim() ? envKey.trim() : null;
}

export function resolveModel(config: AiRuntimeConfig): string {
  if (config.model && config.model.trim()) return config.model.trim();
  if (config.provider === "demo") return "demo-v1";
  const envModel = process.env.AI_MODEL;
  if (envModel && envModel.trim()) return envModel.trim();
  return DEFAULT_MODELS[config.provider];
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiError("El proveedor de IA tardó demasiado en responder. Inténtalo de nuevo.", "AI_TIMEOUT");
    }
    throw new AiError(
      `No se pudo conectar con el proveedor de IA: ${error instanceof Error ? error.message : "error de red"}`,
      "AI_NETWORK",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const trimmed = text.slice(0, 400);
    return trimmed || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  extraHeaders: Record<string, string> = {},
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    throw new AiError(
      `El proveedor de IA respondió ${response.status}: ${await readErrorMessage(response)}`,
      "AI_PROVIDER_ERROR",
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new AiError("El proveedor de IA devolvió una respuesta vacía.", "AI_EMPTY");
  }
  return {
    text,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    throw new AiError(
      `Anthropic respondió ${response.status}: ${await readErrorMessage(response)}`,
      "AI_PROVIDER_ERROR",
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
  if (!text.trim()) {
    throw new AiError("Anthropic devolvió una respuesta vacía.", "AI_EMPTY");
  }
  return {
    text,
    tokensIn: data.usage?.input_tokens ?? 0,
    tokensOut: data.usage?.output_tokens ?? 0,
  };
}


async function dispatchCompletion(
  system: string,
  user: string,
  provider: Exclude<AiProviderId, "demo">,
  apiKey: string,
  model: string,
  baseUrl?: string | null,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  if (provider === "anthropic") {
    return callAnthropic(apiKey, model, system, user);
  }
  if (provider === "openrouter") {
    return callOpenAiCompatible(
      baseUrl || process.env.AI_BASE_URL || OPENAI_COMPATIBLE_BASE_URLS.openrouter,
      apiKey,
      model,
      system,
      user,
      {
        "HTTP-Referer": process.env.SHOPIFY_APP_URL ?? "https://shopgenius.ai",
        "X-Title": "ShopGenius AI",
      },
    );
  }
  return callOpenAiCompatible(
    baseUrl ||
      process.env.AI_BASE_URL ||
      (provider === "qwen" ? OPENAI_COMPATIBLE_BASE_URLS.qwen : OPENAI_COMPATIBLE_BASE_URLS.openai),
    apiKey,
    model,
    system,
    user,
  );
}

/**
 * Genera contenido de producto con el proveedor configurado.
 * Si no hay API key (o el proveedor es "demo") devuelve contenido demo.
 */
export async function generateProductContent(
  product: ProductBrief,
  options: GenerationOptions,
  config: AiRuntimeConfig,
): Promise<AiResult> {
  const provider = isProviderId(config.provider) ? config.provider : "demo";
  const apiKey = resolveApiKey({ ...config, provider });
  const model = resolveModel({ ...config, provider });

  if (provider === "demo" || !apiKey) {
    const content = generateDemoContent(product, options);
    return {
      content,
      provider: "demo",
      model: "demo-v1",
      tokensIn: 0,
      tokensOut: 0,
      demo: true,
    };
  }

  const { system, user } = buildProductPrompt(product, options);
  const result = await dispatchCompletion(
    system,
    user,
    provider,
    apiKey,
    model,
    config.baseUrl,
  );

  return {
    content: parseAiContent(result.text, {
      title: product.title,
      imageCount: Math.min(options.imageCount ?? product.images?.length ?? 0, 10),
    }),
    provider,
    model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    demo: false,
  };
}


export interface RecommendationAiResult {
  result: RecommendationResult;
  provider: AiProviderId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  demo: boolean;
}

/** Recomendaciones de cross-sell limitadas al catálogo real de la tienda. */
export async function generateRecommendations(
  product: ProductBrief,
  catalog: CatalogItem[],
  options: GenerationOptions,
  config: AiRuntimeConfig,
): Promise<RecommendationAiResult> {
  const provider = isProviderId(config.provider) ? config.provider : "demo";
  const apiKey = resolveApiKey({ ...config, provider });
  const model = resolveModel({ ...config, provider });

  if (provider === "demo" || !apiKey) {
    return {
      result: demoRecommendations(product, catalog, options.language),
      provider: "demo",
      model: "demo-v1",
      tokensIn: 0,
      tokensOut: 0,
      demo: true,
    };
  }

  const { system, user } = buildRecommendationPrompt(product, catalog, options);
  const completion = await dispatchCompletion(system, user, provider, apiKey, model, config.baseUrl);

  return {
    result: parseRecommendations(completion.text, catalog, `${product.title}`),
    provider,
    model,
    tokensIn: completion.tokensIn,
    tokensOut: completion.tokensOut,
    demo: false,
  };
}
