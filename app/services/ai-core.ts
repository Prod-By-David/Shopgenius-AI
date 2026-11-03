/**
 * Núcleo puro del motor de IA: construcción de prompts, parseo robusto de la
 * respuesta y generador de respaldo (modo demo) para poder probar la app sin
 * consumir créditos de ningún proveedor.
 */
import { sanitizeHtml, scoreSeoContent, truncate } from "./seo";

export type AiProviderId = "demo" | "openai" | "anthropic" | "openrouter" | "qwen";

export interface ProductBrief {
  id?: string;
  title: string;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[];
  price?: string | null;
  currentDescription?: string | null;
  variants?: string[];
  images?: Array<{ id?: string; url?: string; altText?: string | null }>;
}

export interface GenerationOptions {
  tone: string;
  language: string;
  keywords?: string[];
  targetAudience?: string;
  instructions?: string;
  brandVoice?: string;
  storeDescription?: string;
  /** Número de imágenes para las que generar alt text. */
  imageCount?: number;
}

export interface GeneratedContent {
  descriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  altTexts: string[];
  bulletPoints: string[];
  keywords: string[];
  notes?: string;
}

export const TONES = [
  "profesional",
  "cercano",
  "premium",
  "divertido",
  "minimalista",
  "persuasivo",
] as const;

export const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Portugués" },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

/** Prompt del sistema: fija rol, formato de salida y límites SEO. */
export function buildSystemPrompt(): string {
  return [
    "Eres un copywriter senior de ecommerce especializado en SEO y conversión para tiendas Shopify.",
    "Escribes contenido original, veraz y sin inventar certificaciones, materiales ni plazos que no se te den.",
    "Devuelves SIEMPRE un único objeto JSON válido, sin markdown, sin comentarios y sin texto adicional.",
    "El JSON debe tener exactamente estas claves:",
    '{"descriptionHtml": string, "metaTitle": string, "metaDescription": string, "tags": string[], "altTexts": string[], "bulletPoints": string[], "keywords": string[], "notes": string}',
    "Reglas:",
    "- descriptionHtml: HTML limpio con <p>, <h2>, <ul>/<li> y <strong>. Entre 300 y 900 caracteres visibles. Sin <html>, <body>, scripts ni estilos.",
    "- metaTitle: 30–60 caracteres, incluye la palabra clave principal y la marca si aporta.",
    "- metaDescription: 120–160 caracteres con beneficio + llamada a la acción.",
    "- tags: 5–10 etiquetas cortas en minúsculas, sin duplicados.",
    "- altTexts: un texto alternativo descriptivo por cada imagen indicada (mismo número y orden).",
    "- bulletPoints: 3–5 bullets de venta sin HTML.",
    "- keywords: 3–8 palabras clave long-tail realistas.",
    "- notes: una frase breve para el comerciante (opcional).",
  ].join("\n");
}

/** Prompt de usuario con todo el contexto del producto y de la marca. */
export function buildProductPrompt(
  product: ProductBrief,
  options: GenerationOptions,
): { system: string; user: string } {
  const keywords = (options.keywords ?? []).filter(Boolean);
  const imageCount = options.imageCount ?? Math.min(product.images?.length ?? 0, 5);
  const images = (product.images ?? []).slice(0, imageCount);

  const lines: string[] = [
    `Idioma de salida: ${languageLabel(options.language)} (${options.language}).`,
    `Tono de marca: ${options.tone}.`,
    `Producto: ${product.title}`,
  ];

  if (product.productType) lines.push(`Tipo de producto: ${product.productType}`);
  if (product.vendor) lines.push(`Marca/Fabricante: ${product.vendor}`);
  if (product.price) lines.push(`Precio de referencia: ${product.price}`);
  if (product.tags?.length) lines.push(`Etiquetas actuales: ${product.tags.join(", ")}`);
  if (product.variants?.length) lines.push(`Variantes: ${product.variants.slice(0, 12).join(" | ")}`);
  if (keywords.length) lines.push(`Palabras clave objetivo: ${keywords.join(", ")}`);
  if (options.targetAudience) lines.push(`Público objetivo: ${options.targetAudience}`);
  if (options.storeDescription) lines.push(`Sobre la tienda: ${options.storeDescription}`);
  if (options.brandVoice) lines.push(`Guía de voz de marca: ${options.brandVoice}`);
  if (product.currentDescription) {
    lines.push(`Descripción actual (mejora, no copies literalmente): ${truncate(product.currentDescription, 1200)}`);
  }
  if (images.length) {
    lines.push(
      `Imágenes para alt text (${images.length}): ${images
        .map((image, index) => `#${index + 1} ${image.url ?? "sin url"}${image.altText ? ` (alt actual: ${image.altText})` : ""}`)
        .join(" | ")}`,
    );
  }
  if (options.instructions) lines.push(`Instrucciones adicionales del comerciante: ${options.instructions}`);

  lines.push(
    "Genera el JSON ahora. No añadas markdown ni explicaciones fuera del JSON.",
  );

  return { system: buildSystemPrompt(), user: lines.join("\n") };
}

function toStringArray(value: unknown, max = 12): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, max);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((item) => item.replace(/^[-•*\d.\s]+/, "").trim())
      .filter((item) => item.length > 0)
      .slice(0, max);
  }
  return [];
}

/** Extrae el primer objeto JSON equilibrado de una respuesta del modelo. */
export function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // seguimos con la extracción por llaves
  }

  const start = cleaned.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = cleaned.slice(start, index + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Convierte la respuesta cruda del modelo en contenido seguro y acotado. */
export function parseAiContent(
  raw: string,
  fallback: { title: string; imageCount?: number },
): GeneratedContent {
  const parsed = extractJson(raw) ?? {};
  const fallbackDescription = `<p>${fallback.title}</p>`;

  const descriptionHtml = sanitizeHtml(
    typeof parsed.descriptionHtml === "string" && parsed.descriptionHtml.trim().length > 0
      ? parsed.descriptionHtml
      : typeof parsed.description === "string"
        ? parsed.description
        : fallbackDescription,
  );

  const metaTitle = truncate(
    typeof parsed.metaTitle === "string" && parsed.metaTitle.trim()
      ? parsed.metaTitle.trim()
      : fallback.title,
    60,
  );

  const metaDescription = truncate(
    typeof parsed.metaDescription === "string" && parsed.metaDescription.trim()
      ? parsed.metaDescription.trim()
      : `Descubre ${fallback.title}: calidad, diseño y envío rápido. Compra online hoy.`,
    160,
  );

  const altTexts = toStringArray(parsed.altTexts, 10);
  const imageCount = fallback.imageCount ?? 0;
  while (altTexts.length < imageCount) {
    altTexts.push(`${fallback.title} — imagen ${altTexts.length + 1}`);
  }

  return {
    descriptionHtml,
    metaTitle,
    metaDescription,
    tags: toStringArray(parsed.tags, 10).map((tag) => tag.toLowerCase()),
    altTexts: altTexts.slice(0, Math.max(imageCount, altTexts.length)),
    bulletPoints: toStringArray(parsed.bulletPoints, 5),
    keywords: toStringArray(parsed.keywords, 8),
    notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 280) : undefined,
  };
}

/**
 * Generador local determinista (modo demo). Permite demostrar la app, hacer
 * tests y validar el flujo completo de Shopify/Billing sin clave de IA.
 */
export function generateDemoContent(
  product: ProductBrief,
  options: GenerationOptions,
): GeneratedContent {
  const isEnglish = options.language === "en";
  const audience = options.targetAudience || (isEnglish ? "online shoppers" : "clientes que compran online");
  const type = product.productType || (isEnglish ? "product" : "producto");
  const keywordList = (options.keywords ?? []).filter(Boolean);
  const mainKeyword = keywordList[0] || product.title.toLowerCase();
  const priceLine = product.price
    ? isEnglish
      ? `Available from ${product.price}.`
      : `Disponible desde ${product.price}.`
    : "";

  const descriptionHtml = isEnglish
    ? [
        `<p><strong>${product.title}</strong> is designed for ${audience}: a ${type} that combines everyday performance with a clean, modern finish.</p>`,
        `<h2>Why choose it</h2>`,
        `<ul><li>Carefully selected materials for daily use.</li><li>Versatile design that fits ${mainKeyword} routines.</li><li>Ready to ship with tracked delivery.</li></ul>`,
        `<p>${priceLine} Add it to your cart and get the most out of every order.</p>`,
      ].join("")
    : [
        `<p><strong>${product.title}</strong> está pensado para ${audience}: un ${type} que combina rendimiento diario con un acabado cuidado y actual.</p>`,
        `<h2>Por qué elegirlo</h2>`,
        `<ul><li>Materiales seleccionados para un uso intensivo.</li><li>Diseño versátil que encaja con tu día a día.</li><li>Envío rápido y seguimiento de tu pedido.</li></ul>`,
        `<p>${priceLine} Añádelo al carrito y descubre por qué es una de nuestras opciones más vendidas.</p>`,
      ].join("");

  const tags = Array.from(
    new Set(
      [
        ...(product.tags ?? []),
        mainKeyword,
        type.toLowerCase(),
        ...keywordList.slice(1),
        isEnglish ? "bestseller" : "más vendido",
        isEnglish ? "online shop" : "compra online",
      ]
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);

  const imageCount = Math.min(options.imageCount ?? product.images?.length ?? 3, 8);
  const altTexts = Array.from({ length: imageCount }, (_, index) =>
    index === 0
      ? `${product.title} — ${isEnglish ? "main product image" : "imagen principal del producto"}`
      : `${product.title} — ${isEnglish ? "detail" : "detalle"} ${index + 1}`,
  );

  return {
    descriptionHtml,
    metaTitle: truncate(`${product.title} | ${product.vendor ?? "ShopGenius"}`, 60),
    metaDescription: truncate(
      isEnglish
        ? `Shop ${product.title} online. ${product.productType ?? "Quality product"} with fast shipping, easy returns and secure checkout in our store.`
        : `Compra ${product.title} online. ${product.productType ?? "Producto de calidad"} con envío rápido, devoluciones fáciles y pago seguro en nuestra tienda.`,
      160,
    ),
    tags,
    altTexts,
    bulletPoints: isEnglish
      ? ["Premium finish", "Fast shipping", "Easy returns", "Secure checkout"]
      : ["Acabado premium", "Envío rápido", "Devoluciones fáciles", "Pago seguro"],
    keywords: keywordList.length
      ? keywordList
      : [mainKeyword, `${mainKeyword} online`, `${mainKeyword} ${product.productType ?? ""}`.trim()],
    notes: isEnglish
      ? "Demo content generated without an AI provider. Configure your API key in Settings."
      : "Contenido demo generado sin proveedor de IA. Configura tu API key en Ajustes.",
  };
}

/** Puntuación SEO del contenido generado (0–100). */
export function scoreGenerated(content: GeneratedContent): number {
  return scoreSeoContent(content).score;
}

/* ------------------------------------------------------------------------- */
/* Recomendaciones cruzadas (cross-sell)                                     */
/* ------------------------------------------------------------------------- */

export interface CatalogItem {
  id: string;
  title: string;
  type?: string | null;
  price?: string | null;
  tags?: string[];
}

export interface Recommendation {
  productId: string;
  title: string;
  reason: string;
  bundleIdea: string;
  confidence: number;
}

export interface RecommendationResult {
  headline: string;
  recommendations: Recommendation[];
}

export function buildRecommendationPrompt(
  product: ProductBrief,
  catalog: CatalogItem[],
  options: GenerationOptions,
): { system: string; user: string } {
  const system = [
    "Eres un estratega de merchandising de ecommerce especializado en cross-sell.",
    "Elige solo productos del catálogo proporcionado, nunca inventes productos ni IDs.",
    "Devuelve SIEMPRE un único objeto JSON válido, sin markdown ni texto adicional, con esta forma:",
    '{"headline": string, "recommendations": [{"productId": string, "title": string, "reason": string, "bundleIdea": string, "confidence": number}]}',
    "Reglas: devuelve 2–4 recomendaciones, reason de máximo 180 caracteres, bundleIdea de máximo 140, confidence entre 0 y 1, y no incluyas el producto principal.",
  ].join("\n");

  const user = [
    `Idioma de salida: ${languageLabel(options.language)} (${options.language}).`,
    `Producto principal: ${product.title}${product.productType ? ` (${product.productType})` : ""}.`,
    product.price ? `Precio: ${product.price}.` : "",
    product.tags?.length ? `Etiquetas: ${product.tags.join(", ")}.` : "",
    options.targetAudience ? `Público objetivo: ${options.targetAudience}.` : "",
    options.storeDescription ? `Sobre la tienda: ${options.storeDescription}.` : "",
    "Catálogo disponible (usa exactamente estos productId):",
    catalog
      .slice(0, 40)
      .map(
        (item) =>
          `- ${item.id} | ${item.title} | ${item.type ?? "sin tipo"} | ${item.price ?? "sin precio"} | ${(item.tags ?? []).join(", ")}`,
      )
      .join("\n"),
    "Genera el JSON ahora.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export function parseRecommendations(
  raw: string,
  catalog: CatalogItem[],
  fallbackHeadline: string,
): RecommendationResult {
  const parsed = extractJson(raw) ?? {};
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const byTitle = new Map(catalog.map((item) => [item.title.toLowerCase(), item]));

  const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const recommendations: Recommendation[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const rawId = typeof record.productId === "string" ? record.productId.trim() : "";
    const rawTitle = typeof record.title === "string" ? record.title.trim() : "";
    const matched = byId.get(rawId) ?? byTitle.get(rawTitle.toLowerCase());
    if (!matched) continue;
    if (recommendations.some((item) => item.productId === matched.id)) continue;

    const confidence = Number(record.confidence);
    recommendations.push({
      productId: matched.id,
      title: matched.title,
      reason:
        typeof record.reason === "string" && record.reason.trim()
          ? truncate(record.reason, 200)
          : "Complementa bien este producto.",
      bundleIdea:
        typeof record.bundleIdea === "string" && record.bundleIdea.trim()
          ? truncate(record.bundleIdea, 160)
          : `Pack con ${matched.title}`,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.6,
    });
    if (recommendations.length >= 4) break;
  }

  return {
    headline:
      typeof parsed.headline === "string" && parsed.headline.trim()
        ? truncate(parsed.headline, 140)
        : fallbackHeadline,
    recommendations,
  };
}

/** Alternativa determinista para el modo demo y los tests. */
export function demoRecommendations(
  product: ProductBrief,
  catalog: CatalogItem[],
  language = "es",
): RecommendationResult {
  const isEnglish = language === "en";
  const productTags = new Set((product.tags ?? []).map((tag) => tag.toLowerCase()));

  const scored = catalog
    .filter((item) => item.id !== product.id)
    .map((item) => {
      const shared = (item.tags ?? []).filter((tag) => productTags.has(tag.toLowerCase())).length;
      const sameType = item.type && item.type === product.productType ? 2 : 0;
      return { item, score: shared + sameType };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    headline: isEnglish
      ? `Complete the look with ${product.title}`
      : `Completa tu compra con ${product.title}`,
    recommendations: scored.map(({ item, score }, index) => ({
      productId: item.id,
      title: item.title,
      reason: isEnglish
        ? `${item.title} pairs naturally with ${product.title} and increases average order value.`
        : `${item.title} encaja de forma natural con ${product.title} y sube el ticket medio.`,
      bundleIdea: isEnglish
        ? `Bundle: ${product.title} + ${item.title}`
        : `Pack: ${product.title} + ${item.title}`,
      confidence: Math.min(0.95, 0.6 + score * 0.1 + index * 0.02),
    })),
  };
}
