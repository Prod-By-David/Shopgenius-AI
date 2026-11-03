import type { AiProviderId } from "./ai-core";

/** Metadatos de proveedores sin dependencias de servidor (seguro en cliente). */
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

export const PROVIDER_IDS: AiProviderId[] = [
  "demo",
  "openai",
  "anthropic",
  "openrouter",
  "qwen",
];

export function isProviderId(value: unknown): value is AiProviderId {
  return typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);
}

export const DEFAULT_MODEL_LABELS: Record<AiProviderId, string> = {
  demo: "demo-v1",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  openrouter: "qwen/qwen-2.5-72b-instruct",
  qwen: "qwen-plus",
};
