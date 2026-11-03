import { describe, expect, it } from "vitest";

import {
  buildProductPrompt,
  buildSystemPrompt,
  extractJson,
  generateDemoContent,
  parseAiContent,
} from "../app/services/ai-core";

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
  it("normaliza campos, recorta longitudes y Rellena alt text", () => {
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
    expect(result.tags).toEqual(["mochila", "outdoor", "mochila"]);
    expect(result.altTexts).toHaveLength(3);
    expect(result.keywords).toEqual(["mochila", "outdoor"]);
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
