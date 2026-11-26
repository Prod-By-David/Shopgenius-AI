import { describe, expect, it } from "vitest";

import { applyEnvDefaults, readEnvFileValue } from "../scripts/setup-env.mjs";

const KEY = () => "a".repeat(64);

describe("scripts/setup-env (crea el .env de modo prueba)", () => {
  it("sin .env añade DATABASE_URL, modo prueba y clave de cifrado", () => {
    const { content, added } = applyEnvDefaults("", {}, KEY);
    expect(added).toEqual(["DATABASE_URL", "APP_MODE", "BILLING_TEST_MODE", "APP_ENCRYPTION_KEY"]);
    expect(content).toContain("DATABASE_URL=file:dev.sqlite\n");
    expect(content).toContain("APP_MODE=test\n");
    expect(content).toContain("BILLING_TEST_MODE=true\n");
    expect(content).toContain(`APP_ENCRYPTION_KEY=${"a".repeat(64)}\n`);
  });

  it("no pisa valores que ya existen en el .env", () => {
    const original = "DATABASE_URL=postgresql://u:p@host/db\nAPP_MODE=live\nBILLING_TEST_MODE=false\nAPP_ENCRYPTION_KEY=abc\n";
    const { content, added } = applyEnvDefaults(original, {}, KEY);
    expect(added).toEqual([]);
    expect(content).toBe(original);
  });

  it("no pisa valores definidos en el entorno del proceso", () => {
    const { content, added } = applyEnvDefaults("", { DATABASE_URL: "file:otra.sqlite" }, KEY);
    expect(added).not.toContain("DATABASE_URL");
    expect(content).not.toContain("DATABASE_URL");
  });

  it("rellena en su sitio las claves vacías (.env copiado de .env.example)", () => {
    const original = "SHOPIFY_API_KEY=\nDATABASE_URL=file:dev.sqlite\nAPP_ENCRYPTION_KEY=\n";
    const { content, added } = applyEnvDefaults(original, {}, KEY);
    expect(added).toContain("APP_ENCRYPTION_KEY");
    expect(added).not.toContain("DATABASE_URL");
    expect(content.match(/APP_ENCRYPTION_KEY=/g)).toHaveLength(1);
    expect(content).toContain(`APP_ENCRYPTION_KEY=${"a".repeat(64)}`);
    expect(content).toContain("SHOPIFY_API_KEY=\n");
  });

  it("ignora las líneas comentadas y respeta el salto de línea final", () => {
    const original = "# DATABASE_URL=file:comentado.sqlite\nSHOPIFY_API_KEY=x";
    const { content } = applyEnvDefaults(original, {}, KEY);
    expect(content.startsWith("# DATABASE_URL=file:comentado.sqlite\nSHOPIFY_API_KEY=x\nDATABASE_URL=")).toBe(true);
    expect(readEnvFileValue(content, "DATABASE_URL")).toBe("file:dev.sqlite");
  });

  it("lee valores con comillas y 'export'", () => {
    expect(readEnvFileValue('export DATABASE_URL="file:x.sqlite"\n', "DATABASE_URL")).toBe("file:x.sqlite");
    expect(readEnvFileValue("OTRA=1\n", "DATABASE_URL")).toBeUndefined();
    expect(readEnvFileValue("DATABASE_URL=\n", "DATABASE_URL")).toBe("");
  });

  it("es idempotente: una segunda ejecución no cambia nada", () => {
    const first = applyEnvDefaults("", {}, KEY);
    const second = applyEnvDefaults(first.content, {}, KEY);
    expect(second.added).toEqual([]);
    expect(second.content).toBe(first.content);
  });
});
