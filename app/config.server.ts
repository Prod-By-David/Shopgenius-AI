/**
 * Configuración central de ejecución de ShopGenius AI.
 *
 * MODO PRUEBA (por defecto)
 * -------------------------
 * Todo el proyecto arranca en modo prueba: los cobros son cargos de prueba
 * (sandbox de Shopify, no se factura nada) y la IA usa el modo demo salvo que
 * se configure una clave de forma expresa.
 *
 * Pasar a modo real es una decisión deliberada que se toma cuando se vaya a
 * vender el producto. Exige DOS interruptores explícitos a la vez:
 *   APP_MODE=live  y  BILLING_TEST_MODE=false
 * Con cualquier otra combinación los cargos siguen siendo de prueba.
 *
 * Este módulo es puro (sin dependencias de servidor) para poder testearlo.
 */
import type { ApiVersion } from "@shopify/shopify-app-remix/server";

type Env = Record<string, string | undefined>;

export type AppMode = "test" | "live";

/** Versión de la Admin API (estable y soportada por Shopify). */
export const DEFAULT_SHOPIFY_API_VERSION = "2026-10";

export function resolveAppMode(env: Env = process.env): AppMode {
  return env.APP_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
}

/**
 * `true` = cargos de prueba. Solo devuelve `false` (cargos reales) si se
 * confirman a la vez APP_MODE=live y BILLING_TEST_MODE=false.
 */
export function resolveBillingTestMode(env: Env = process.env): boolean {
  const liveConfirmed = resolveAppMode(env) === "live";
  const explicitReal = env.BILLING_TEST_MODE?.trim().toLowerCase() === "false";
  return !(liveConfirmed && explicitReal);
}

/** Días de prueba gratuita de la suscripción de pago (0 = sin prueba). */
export function resolveTrialDays(env: Env = process.env): number {
  const parsed = Number.parseInt(env.BILLING_TRIAL_DAYS ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 30);
}

export function resolveApiVersion(env: Env = process.env): string {
  return env.SHOPIFY_API_VERSION?.trim() || DEFAULT_SHOPIFY_API_VERSION;
}

export const APP_MODE: AppMode = resolveAppMode();
export const IS_TEST_MODE = APP_MODE === "test";
export const BILLING_TEST_MODE = resolveBillingTestMode();
export const BILLING_TRIAL_DAYS = resolveTrialDays();

/**
 * Versión de la API como tipo `ApiVersion` de la librería oficial. Se castea
 * desde `string` para poder subir de versión con solo cambiar una variable.
 */
const apiVersionString: string = resolveApiVersion();
export const SHOPIFY_API_VERSION = apiVersionString as ApiVersion;
export const SHOPIFY_API_VERSION_LABEL = apiVersionString;
