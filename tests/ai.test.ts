import { describe, expect, it } from "vitest";

import {
  buildProductPrompt,
  buildSystemPrompt,
  escapeHtml,
  extractJson,
  generateDemoContent,
  parseAiContent,
} from "../app/services/ai-core";
import { DEFAULT_MODELS, PROVIDER_IDS, isProviderId } from "../app/services/ai-providers";

describe("buildProductPrompt", () => {
  it("incluye producto, tono e idioma y pide JSON", () => {
    const { system, user } = buildProductPrompt(
      {
        title: "Mochila Impermeable 25L",
        productType: "Mochila",
        vendor: "TrekCo",
        tags: ["outdoor", "mochila"],
        price: "59.90",
        images: [{ id: "1", url: "https://cdn.example/img.jpg", altText: null }],
        variants: ["Negra (59.90)"],
      },
      {
        tone: "premium",
        language: "es",
        keywords: ["mochila impermeable"],
        targetAudience: "excursionistas",
      },
    );

    expect(system).toContain("JSON");
    expect(user).toContain("Mochila Impermeable 25L");
    expect(user).toContain("premium");
    expect(user).toContain("Español");
    expect(user).toContain("mochila impermeable");
    expect(user).toContain("excursionistas");
  });

  it("el prompt de sistema fija los límites SEO", () => {
    const system = buildSystemPrompt();
    expect(system).toContain("30–60");
    expect(system).toContain("120–160");
  });
});

describe("extractJson", () => {
  it("parsea JSON envuelto en markdown", () => {
    const parsed = extractJson('```json\n{"metaTitle":"Hola"}\n```');
    expect(parsed).toEqual({ metaTitle: "Hola" });
  });

  it("extrae un objeto con llaves anidadas", () => {
    const parsed = extractJson('Texto previo {"a":{"b":"}"},"c":1} texto posterior');
    expect(parsed).toEqual({ a: { b: "}" }, c: 1 });
  });

  it("devuelve null si no hay objeto", () => {
    expect(extractJson("sin json")).toBeNull();
  });
});

describe("parseAiContent", () => {
  it("normaliza campos, recorta longitudes, elimina etiquetas repetidas y rellena alt text", () => {
    const result = parseAiContent(
      JSON.stringify({
        descriptionHtml: "<p>Descripción</p><script>alert(1)</script>",
        metaTitle: "x".repeat(120),
        metaDescription: "y".repeat(300),
        tags: ["Mochila", " OUTDOOR ", "mochila"],
        altTexts: ["Alt 1"],
        bulletPoints: ["Uno", "Dos"],
        keywords: "mochila, outdoor",
      }),
      { title: "Mochila", imageCount: 3 },
    );

    expect(result.descriptionHtml).not.toContain("script");
    expect(result.metaTitle.length).toBeLessThanOrEqual(60);
    expect(result.metaDescription.length).toBeLessThanOrEqual(160);
    expect(result.tags).toEqual(["mochila", "outdoor"]);
    expect(result.altTexts).toHaveLength(3);
    expect(result.keywords).toEqual(["mochila", "outdoor"]);
  });

  it("no devuelve más alt texts que imágenes", () => {
    const result = parseAiContent(
      JSON.stringify({ altTexts: ["A", "B", "C", "D"], metaTitle: "T", metaDescription: "D" }),
      { title: "Mochila", imageCount: 2 },
    );
    expect(result.altTexts).toHaveLength(2);
  });

  it("usa fallback si la respuesta está vacía", () => {
    const result = parseAiContent("", { title: "Producto Demo", imageCount: 0 });
    expect(result.descriptionHtml).toContain("Producto Demo");
    expect(result.metaTitle).toContain("Producto Demo");
    expect(result.metaDescription.length).toBeGreaterThan(0);
  });
});

describe("generateDemoContent", () => {
  it("genera contenido completo y en el idioma pedido", () => {
    const es = generateDemoContent(
      { title: "Lámpara Nórdica", productType: "Iluminación", tags: ["lámpara"] },
      { tone: "cercano", language: "es", keywords: ["lámpara nórdica"], imageCount: 2 },
    );
    expect(es.descriptionHtml).toContain("Lámpara Nórdica");
    expect(es.tags.length).toBeGreaterThanOrEqual(3);
    expect(es.altTexts).toHaveLength(2);

    const en = generateDemoContent(
      { title: "Nordic Lamp", productType: "Lighting" },
      { tone: "friendly", language: "en", keywords: [], imageCount: 1 },
    );
    expect(en.descriptionHtml).toContain("Nordic Lamp");
    expect(en.descriptionHtml).toContain("Why choose it");
  });
});

import {
  buildRecommendationPrompt,
  demoRecommendations,
  parseRecommendations,
} from "../app/services/ai-core";

const catalog = [
  { id: "1", title: "Mochila 25L", type: "Mochila", price: "59.90", tags: ["outdoor", "mochila"] },
  { id: "2", title: "Botella térmica", type: "Accesorio", price: "19.90", tags: ["outdoor", "botella"] },
  { id: "3", title: "Calcetines técnicos", type: "Accesorio", price: "12.00", tags: ["outdoor"] },
];

describe("recomendaciones", () => {
  it("el prompt incluye el catálogo y prohíbe inventar productos", () => {
    const { system, user } = buildRecommendationPrompt(
      { id: "1", title: "Mochila 25L", productType: "Mochila" },
      catalog,
      { tone: "cercano", language: "es" },
    );
    expect(system).toContain("nunca inventes");
    expect(user).toContain("Botella térmica");
  });

  it("filtra recomendaciones que no están en el catálogo", () => {
    const result = parseRecommendations(
      JSON.stringify({
        headline: "Completa tu equipo",
        recommendations: [
          { productId: "2", title: "Botella térmica", reason: "Encaja", bundleIdea: "Pack", confidence: 0.9 },
          { productId: "999", title: "Producto inventado", reason: "No existe", bundleIdea: "", confidence: 0.5 },
        ],
      }),
      catalog,
      "Fallback",
    );
    expect(result.headline).toBe("Completa tu equipo");
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.productId).toBe("2");
  });

  it("el modo demo prioriza productos con etiquetas compartidas", () => {
    const result = demoRecommendations(
      { id: "1", title: "Mochila 25L", productType: "Mochila", tags: ["outdoor", "mochila"] },
      catalog,
    );
    expect(result.recommendations.length).toBe(2);
    expect(result.recommendations.every((item) => item.productId !== "1")).toBe(true);
  });
});

describe("escapeHtml y contenido demo seguro", () => {
  it("escapa los caracteres especiales de HTML", () => {
    expect(escapeHtml(`<b>"Tom & 'Jerry'"</b>`)).toBe(
      "&lt;b&gt;&quot;Tom &amp; &#39;Jerry&#39;&quot;&lt;/b&gt;",
    );
  });

  it("el modo demo no inyecta HTML del título del producto", () => {
    const demo = generateDemoContent(
      { title: "<img src=x onerror=alert(1)>", productType: "<script>x</script>" },
      { tone: "cercano", language: "es", keywords: ["<b>kw</b>"], imageCount: 1 },
    );
    expect(demo.descriptionHtml).not.toContain("<img");
    expect(demo.descriptionHtml).not.toContain("<script");
    expect(demo.descriptionHtml).toContain("&lt;img");
  });
});

describe("proveedores de IA", () => {
  it("todos los proveedores tienen modelo por defecto y 'demo' es válido", () => {
    expect(PROVIDER_IDS).toContain("demo");
    for (const id of PROVIDER_IDS) {
      expect(DEFAULT_MODELS[id].length).toBeGreaterThan(0);
      expect(isProviderId(id)).toBe(true);
    }
    expect(isProviderId("gemini")).toBe(false);
  });

  it("el modelo de Anthropic por defecto no es un alias retirado", () => {
    expect(DEFAULT_MODELS.anthropic).not.toMatch(/claude-3/);
  });
});
