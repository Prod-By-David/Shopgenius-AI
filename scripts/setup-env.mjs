#!/usr/bin/env node
/**
 * Prepara el archivo `.env` para desarrollo en MODO PRUEBA.
 *
 * Problema que resuelve: Prisma exige DATABASE_URL (incluso para
 * `prisma generate`), y el repositorio no incluye `.env` (contiene secretos y
 * está en .gitignore). Sin este script, `npm run dev` fallaba con
 * "Environment variable not found: DATABASE_URL" (error P1012).
 *
 * Qué hace: añade a `.env` (lo crea si no existe) SOLO las variables que falten
 * y que no estén ya definidas en el entorno:
 *   DATABASE_URL        → SQLite local (prisma/dev.sqlite)
 *   APP_MODE            → test
 *   BILLING_TEST_MODE   → true   (cargos de prueba de Shopify)
 *   APP_ENCRYPTION_KEY  → clave aleatoria para cifrar las API keys de IA
 * Nunca pisa valores que ya tengas. En producción (NODE_ENV=production) no hace
 * nada: allí las variables se definen en el entorno del servidor.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SIMPLE_DEFAULTS = {
  DATABASE_URL: "file:dev.sqlite",
  APP_MODE: "test",
  BILLING_TEST_MODE: "true",
};

/** Claves cuyo valor por defecto se genera (secretos). */
const GENERATED = ["APP_ENCRYPTION_KEY"];

const KEYS = [...Object.keys(SIMPLE_DEFAULTS), ...GENERATED];

function lineRegex(key) {
  return new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=(.*)$`);
}

/** Valor de `key` en el contenido de un .env: `undefined` si no está, "" si está vacío. */
export function readEnvFileValue(content, key) {
  const regex = lineRegex(key);
  let found;
  for (const line of content.split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const match = regex.exec(line);
    if (match) {
      found = match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return found;
}

/**
 * Calcula el nuevo contenido del .env. Función pura (testeada).
 * @param {string} content contenido actual del .env ("" si no existe)
 * @param {Record<string, string | undefined>} processEnv variables del entorno
 * @param {() => string} generateKey genera la clave de cifrado
 * @returns {{ content: string, added: string[] }}
 */
export function applyEnvDefaults(content, processEnv, generateKey) {
  const added = [];
  let result = content;

  for (const key of KEYS) {
    const fromProcess = (processEnv[key] ?? "").trim();
    if (fromProcess) continue;

    const fromFile = readEnvFileValue(result, key);
    if (fromFile) continue; // ya tiene valor: no se toca

    const value = GENERATED.includes(key) ? generateKey() : SIMPLE_DEFAULTS[key];

    if (fromFile === "") {
      // La clave existe pero vacía (p. ej. copiada de .env.example): se rellena en su sitio.
      const regex = new RegExp(`^([ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=).*$`, "m");
      result = result.replace(regex, `$1${value}`);
    } else {
      if (result.length > 0 && !result.endsWith("\n")) result += "\n";
      result += `${key}=${value}\n`;
    }
    added.push(key);
  }

  return { content: result, added };
}

function main() {
  if (process.env.NODE_ENV === "production") return;

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = path.join(root, ".env");
  const existed = existsSync(envPath);
  const current = existed ? readFileSync(envPath, "utf8") : "";

  const { content, added } = applyEnvDefaults(current, process.env, () =>
    randomBytes(32).toString("hex"),
  );
  if (added.length === 0) return;

  const header = existed
    ? ""
    : "# Generado automáticamente (modo prueba). Puedes editarlo; no se sube al repositorio.\n";
  writeFileSync(envPath, header + content, "utf8");
  console.log(
    `[setup-env] ${existed ? "Actualizado" : "Creado"} .env con valores de modo prueba: ${added.join(", ")}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
