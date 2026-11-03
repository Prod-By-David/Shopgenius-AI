var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, Link, useRouteError, useFetcher, useSearchParams } from "@remix-run/react";
import { createReadableStreamFromReadable, redirect } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { useState, useEffect, useMemo } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, BlockStack, Banner, Layout, Select, InlineStack, Divider, Badge, ProgressBar, Box, EmptyState, List, InlineGrid, Checkbox } from "@shopify/polaris";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
import { NavMenu, useAppBridge, TitleBar } from "@shopify/app-bridge-react";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 8e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function App$1() {
  return /* @__PURE__ */ jsxs("html", { lang: "es", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1
}, Symbol.toStringTag, { value: "Module" }));
const PLANS = {
  FREE: {
    id: "FREE",
    billingName: "ShopGenius Free",
    name: "Free",
    price: 0,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 10,
    tagline: "Prueba la IA en tu tienda sin coste",
    features: [
      "10 generaciones de IA al mes",
      "Descripciones + metadatos SEO",
      "Alt text para imágenes",
      "Historial de 30 días"
    ]
  },
  STARTER: {
    id: "STARTER",
    billingName: "ShopGenius Starter",
    name: "Starter",
    price: 19,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 150,
    tagline: "Para tiendas que empiezan a escalar catálogo",
    features: [
      "150 generaciones de IA al mes",
      "Generación masiva (hasta 5 productos por lote)",
      "Auditoría SEO de la tienda",
      "Tono de marca personalizado",
      "Soporte por email"
    ]
  },
  PRO: {
    id: "PRO",
    billingName: "ShopGenius Pro",
    name: "Pro",
    price: 49,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 500,
    tagline: "El plan recomendado para vender más con menos trabajo",
    features: [
      "500 generaciones de IA al mes",
      "Generación masiva (hasta 10 productos por lote)",
      "Recomendaciones cruzadas (cross-sell) con IA",
      "Auditoría SEO + aplicación en un clic",
      "7 días de prueba gratuita",
      "Soporte prioritario"
    ],
    recommended: true
  },
  SCALE: {
    id: "SCALE",
    billingName: "ShopGenius Scale",
    name: "Scale",
    price: 99,
    currency: "EUR",
    interval: "EVERY_30_DAYS",
    generationLimit: 2e3,
    tagline: "Para catálogos grandes y agencias",
    features: [
      "2.000 generaciones de IA al mes",
      "Lotes de hasta 20 productos",
      "Multi-idioma avanzado",
      "Recomendaciones cruzadas ilimitadas",
      "Onboarding guiado y soporte prioritario"
    ]
  }
};
const PLAN_IDS = ["FREE", "STARTER", "PRO", "SCALE"];
const BILLABLE_PLAN_IDS = ["STARTER", "PRO", "SCALE"];
const DEFAULT_PLAN = "FREE";
function isPlanId(value) {
  return typeof value === "string" && PLAN_IDS.includes(value);
}
function getPlan(id) {
  return isPlanId(id) ? PLANS[id] : PLANS[DEFAULT_PLAN];
}
function getPlanByBillingName(name) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return PLAN_IDS.map((id) => PLANS[id]).find(
    (plan) => plan.billingName.toLowerCase() === normalized
  ) ?? null;
}
function resolveGenerationLimit(plan, override) {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  return plan.generationLimit;
}
function currentPeriodStart(now = /* @__PURE__ */ new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}
function truncate(text, max) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
const ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "blockquote"
]);
function sanitizeHtml(html) {
  if (!html) return "";
  const withoutDangerous = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "").replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "").replace(/javascript:/gi, "");
  return withoutDangerous.replace(
    /<\/?([a-zA-Z0-9]+)([^>]*)>/g,
    (match, tag, _attrs) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      return name === "br" ? "<br />" : match.startsWith("</") ? `</${name}>` : `<${name}>`;
    }
  );
}
function scoreSeoContent(input2) {
  const description = stripHtml(input2.descriptionHtml);
  const metaTitle = (input2.metaTitle ?? "").trim();
  const metaDescription = (input2.metaDescription ?? "").trim();
  const tags = input2.tags ?? [];
  const keywords = (input2.keywords ?? []).filter(Boolean);
  const bullets = input2.bulletPoints ?? [];
  const checks = [];
  const descriptionPoints = description.length >= 600 ? 25 : description.length >= 300 ? 18 : description.length >= 120 ? 10 : 0;
  checks.push({ label: "Descripción completa (300+ caracteres)", points: descriptionPoints, max: 25 });
  const titlePoints = metaTitle.length >= 30 && metaTitle.length <= 60 ? 20 : metaTitle.length > 0 && metaTitle.length <= 70 ? 12 : 0;
  checks.push({ label: "Meta título de 30–60 caracteres", points: titlePoints, max: 20 });
  const metaPoints = metaDescription.length >= 120 && metaDescription.length <= 160 ? 20 : metaDescription.length >= 70 ? 12 : 0;
  checks.push({ label: "Meta descripción de 120–160 caracteres", points: metaPoints, max: 20 });
  const tagPoints = tags.length >= 5 ? 15 : tags.length >= 3 ? 10 : tags.length > 0 ? 5 : 0;
  checks.push({ label: "Etiquetas relevantes (3+)", points: tagPoints, max: 15 });
  const keywordPoints = keywords.length === 0 ? 5 : keywords.filter(
    (keyword) => `${description} ${metaTitle} ${metaDescription}`.toLowerCase().includes(keyword.toLowerCase())
  ).length >= Math.min(2, keywords.length) ? 10 : 4;
  checks.push({ label: "Palabras clave integradas", points: keywordPoints, max: 10 });
  const bulletPoints = bullets.length >= 3 ? 10 : bullets.length > 0 ? 5 : 0;
  checks.push({ label: "Bullets de venta (3+)", points: bulletPoints, max: 10 });
  const score = checks.reduce((total, check) => total + check.points, 0);
  return {
    score,
    breakdown: checks.map((check) => ({ ...check, ok: check.points === check.max }))
  };
}
function auditProduct(product) {
  const issues = [];
  const description = stripHtml(product.descriptionHtml);
  const images = product.images ?? [];
  const tags = product.tags ?? [];
  if (description.length === 0) {
    issues.push({
      code: "missing_description",
      severity: "critical",
      message: "El producto no tiene descripción.",
      hint: "Genera una descripción con IA y publícala en un clic."
    });
  } else if (description.length < 300) {
    issues.push({
      code: "short_description",
      severity: "warning",
      message: `Descripción muy corta (${description.length} caracteres).`,
      hint: "Amplía a 300–900 caracteres con beneficios y detalles de uso."
    });
  }
  if (!product.seoTitle) {
    issues.push({
      code: "missing_seo_title",
      severity: "critical",
      message: "Falta el meta título SEO.",
      hint: "Añade un título de 30–60 caracteres con la keyword principal."
    });
  } else if (product.seoTitle.length > 60) {
    issues.push({
      code: "long_seo_title",
      severity: "warning",
      message: `El meta título tiene ${product.seoTitle.length} caracteres (máx. 60).`,
      hint: "Acórtalo para que no se trunque en Google."
    });
  }
  if (!product.seoDescription) {
    issues.push({
      code: "missing_seo_description",
      severity: "critical",
      message: "Falta la meta descripción.",
      hint: "Genera una de 120–160 caracteres con llamada a la acción."
    });
  } else if (product.seoDescription.length > 160) {
    issues.push({
      code: "long_seo_description",
      severity: "warning",
      message: `La meta descripción tiene ${product.seoDescription.length} caracteres (máx. 160).`,
      hint: "Resume el beneficio principal en menos de 160 caracteres."
    });
  }
  const imagesWithoutAlt = images.filter((image) => !image.altText || !image.altText.trim());
  if (images.length > 0 && imagesWithoutAlt.length > 0) {
    issues.push({
      code: "missing_alt_text",
      severity: imagesWithoutAlt.length === images.length ? "warning" : "opportunity",
      message: `${imagesWithoutAlt.length} de ${images.length} imágenes sin texto alternativo.`,
      hint: "El alt text mejora accesibilidad y posiciona en Google Imágenes."
    });
  }
  if (tags.length < 3) {
    issues.push({
      code: "few_tags",
      severity: "opportunity",
      message: `Solo ${tags.length} etiquetas.`,
      hint: "Añade 5–10 etiquetas de producto para colecciones automáticas."
    });
  }
  if (!product.productType) {
    issues.push({
      code: "missing_product_type",
      severity: "opportunity",
      message: "Sin tipo de producto.",
      hint: "El tipo de producto alimenta filtros y recomendaciones."
    });
  }
  if (product.title.trim().length < 15) {
    issues.push({
      code: "short_title",
      severity: "opportunity",
      message: "Título muy corto para SEO.",
      hint: "Incluye atributo + categoría (ej. «Mochila impermeable 25L»)."
    });
  }
  const score = Math.max(
    0,
    100 - issues.reduce((penalty, issue) => {
      if (issue.severity === "critical") return penalty + 22;
      if (issue.severity === "warning") return penalty + 10;
      return penalty + 4;
    }, 0)
  );
  return { productId: product.id, title: product.title, score, issues };
}
function summarizeAudit(audits) {
  const totalIssues = audits.reduce((total, audit) => total + audit.issues.length, 0);
  const averageScore = audits.length > 0 ? Math.round(audits.reduce((total, audit) => total + audit.score, 0) / audits.length) : 0;
  return {
    totalProducts: audits.length,
    totalIssues,
    averageScore,
    critical: audits.reduce(
      (total, audit) => total + audit.issues.filter((issue) => issue.severity === "critical").length,
      0
    ),
    productsWithIssues: audits.filter((audit) => audit.issues.length > 0).length
  };
}
const TONES = [
  "profesional",
  "cercano",
  "premium",
  "divertido",
  "minimalista",
  "persuasivo"
];
const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Portugués" }
];
function languageLabel(code) {
  var _a2;
  return ((_a2 = LANGUAGES.find((language) => language.code === code)) == null ? void 0 : _a2.label) ?? code;
}
function buildSystemPrompt() {
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
    "- notes: una frase breve para el comerciante (opcional)."
  ].join("\n");
}
function buildProductPrompt(product, options) {
  var _a2, _b, _c;
  const keywords = (options.keywords ?? []).filter(Boolean);
  const imageCount = options.imageCount ?? Math.min(((_a2 = product.images) == null ? void 0 : _a2.length) ?? 0, 5);
  const images = (product.images ?? []).slice(0, imageCount);
  const lines = [
    `Idioma de salida: ${languageLabel(options.language)} (${options.language}).`,
    `Tono de marca: ${options.tone}.`,
    `Producto: ${product.title}`
  ];
  if (product.productType) lines.push(`Tipo de producto: ${product.productType}`);
  if (product.vendor) lines.push(`Marca/Fabricante: ${product.vendor}`);
  if (product.price) lines.push(`Precio de referencia: ${product.price}`);
  if ((_b = product.tags) == null ? void 0 : _b.length) lines.push(`Etiquetas actuales: ${product.tags.join(", ")}`);
  if ((_c = product.variants) == null ? void 0 : _c.length) lines.push(`Variantes: ${product.variants.slice(0, 12).join(" | ")}`);
  if (keywords.length) lines.push(`Palabras clave objetivo: ${keywords.join(", ")}`);
  if (options.targetAudience) lines.push(`Público objetivo: ${options.targetAudience}`);
  if (options.storeDescription) lines.push(`Sobre la tienda: ${options.storeDescription}`);
  if (options.brandVoice) lines.push(`Guía de voz de marca: ${options.brandVoice}`);
  if (product.currentDescription) {
    lines.push(`Descripción actual (mejora, no copies literalmente): ${truncate(product.currentDescription, 1200)}`);
  }
  if (images.length) {
    lines.push(
      `Imágenes para alt text (${images.length}): ${images.map((image, index) => `#${index + 1} ${image.url ?? "sin url"}${image.altText ? ` (alt actual: ${image.altText})` : ""}`).join(" | ")}`
    );
  }
  if (options.instructions) lines.push(`Instrucciones adicionales del comerciante: ${options.instructions}`);
  lines.push(
    "Genera el JSON ahora. No añadas markdown ni explicaciones fuera del JSON."
  );
  return { system: buildSystemPrompt(), user: lines.join("\n") };
}
function toStringArray(value, max = 12) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item.length > 0).slice(0, max);
  }
  if (typeof value === "string") {
    return value.split(/[,;\n]/).map((item) => item.replace(/^[-•*\d.\s]+/, "").trim()).filter((item) => item.length > 0).slice(0, max);
  }
  return [];
}
function extractJson(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
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
            return parsed;
          }
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
function parseAiContent(raw, fallback) {
  const parsed = extractJson(raw) ?? {};
  const fallbackDescription = `<p>${fallback.title}</p>`;
  const descriptionHtml = sanitizeHtml(
    typeof parsed.descriptionHtml === "string" && parsed.descriptionHtml.trim().length > 0 ? parsed.descriptionHtml : typeof parsed.description === "string" ? parsed.description : fallbackDescription
  );
  const metaTitle = truncate(
    typeof parsed.metaTitle === "string" && parsed.metaTitle.trim() ? parsed.metaTitle.trim() : fallback.title,
    60
  );
  const metaDescription = truncate(
    typeof parsed.metaDescription === "string" && parsed.metaDescription.trim() ? parsed.metaDescription.trim() : `Descubre ${fallback.title}: calidad, diseño y envío rápido. Compra online hoy.`,
    160
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
    notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 280) : void 0
  };
}
function generateDemoContent(product, options) {
  var _a2;
  const isEnglish = options.language === "en";
  const audience = options.targetAudience || (isEnglish ? "online shoppers" : "clientes que compran online");
  const type = product.productType || (isEnglish ? "product" : "producto");
  const keywordList = (options.keywords ?? []).filter(Boolean);
  const mainKeyword = keywordList[0] || product.title.toLowerCase();
  const priceLine = product.price ? isEnglish ? `Available from ${product.price}.` : `Disponible desde ${product.price}.` : "";
  const descriptionHtml = isEnglish ? [
    `<p><strong>${product.title}</strong> is designed for ${audience}: a ${type} that combines everyday performance with a clean, modern finish.</p>`,
    `<h2>Why choose it</h2>`,
    `<ul><li>Carefully selected materials for daily use.</li><li>Versatile design that fits ${mainKeyword} routines.</li><li>Ready to ship with tracked delivery.</li></ul>`,
    `<p>${priceLine} Add it to your cart and get the most out of every order.</p>`
  ].join("") : [
    `<p><strong>${product.title}</strong> está pensado para ${audience}: un ${type} que combina rendimiento diario con un acabado cuidado y actual.</p>`,
    `<h2>Por qué elegirlo</h2>`,
    `<ul><li>Materiales seleccionados para un uso intensivo.</li><li>Diseño versátil que encaja con tu día a día.</li><li>Envío rápido y seguimiento de tu pedido.</li></ul>`,
    `<p>${priceLine} Añádelo al carrito y descubre por qué es una de nuestras opciones más vendidas.</p>`
  ].join("");
  const tags = Array.from(
    new Set(
      [
        ...product.tags ?? [],
        mainKeyword,
        type.toLowerCase(),
        ...keywordList.slice(1),
        isEnglish ? "bestseller" : "más vendido",
        isEnglish ? "online shop" : "compra online"
      ].map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    )
  ).slice(0, 8);
  const imageCount = Math.min(options.imageCount ?? ((_a2 = product.images) == null ? void 0 : _a2.length) ?? 3, 8);
  const altTexts = Array.from(
    { length: imageCount },
    (_, index) => index === 0 ? `${product.title} — ${isEnglish ? "main product image" : "imagen principal del producto"}` : `${product.title} — ${isEnglish ? "detail" : "detalle"} ${index + 1}`
  );
  return {
    descriptionHtml,
    metaTitle: truncate(`${product.title} | ${product.vendor ?? "ShopGenius"}`, 60),
    metaDescription: truncate(
      isEnglish ? `Shop ${product.title} online. ${product.productType ?? "Quality product"} with fast shipping, easy returns and secure checkout in our store.` : `Compra ${product.title} online. ${product.productType ?? "Producto de calidad"} con envío rápido, devoluciones fáciles y pago seguro en nuestra tienda.`,
      160
    ),
    tags,
    altTexts,
    bulletPoints: isEnglish ? ["Premium finish", "Fast shipping", "Easy returns", "Secure checkout"] : ["Acabado premium", "Envío rápido", "Devoluciones fáciles", "Pago seguro"],
    keywords: keywordList.length ? keywordList : [mainKeyword, `${mainKeyword} online`, `${mainKeyword} ${product.productType ?? ""}`.trim()],
    notes: isEnglish ? "Demo content generated without an AI provider. Configure your API key in Settings." : "Contenido demo generado sin proveedor de IA. Configura tu API key en Ajustes."
  };
}
function buildRecommendationPrompt(product, catalog, options) {
  var _a2;
  const system = [
    "Eres un estratega de merchandising de ecommerce especializado en cross-sell.",
    "Elige solo productos del catálogo proporcionado, nunca inventes productos ni IDs.",
    "Devuelve SIEMPRE un único objeto JSON válido, sin markdown ni texto adicional, con esta forma:",
    '{"headline": string, "recommendations": [{"productId": string, "title": string, "reason": string, "bundleIdea": string, "confidence": number}]}',
    "Reglas: devuelve 2–4 recomendaciones, reason de máximo 180 caracteres, bundleIdea de máximo 140, confidence entre 0 y 1, y no incluyas el producto principal."
  ].join("\n");
  const user = [
    `Idioma de salida: ${languageLabel(options.language)} (${options.language}).`,
    `Producto principal: ${product.title}${product.productType ? ` (${product.productType})` : ""}.`,
    product.price ? `Precio: ${product.price}.` : "",
    ((_a2 = product.tags) == null ? void 0 : _a2.length) ? `Etiquetas: ${product.tags.join(", ")}.` : "",
    options.targetAudience ? `Público objetivo: ${options.targetAudience}.` : "",
    options.storeDescription ? `Sobre la tienda: ${options.storeDescription}.` : "",
    "Catálogo disponible (usa exactamente estos productId):",
    catalog.slice(0, 40).map(
      (item) => `- ${item.id} | ${item.title} | ${item.type ?? "sin tipo"} | ${item.price ?? "sin precio"} | ${(item.tags ?? []).join(", ")}`
    ).join("\n"),
    "Genera el JSON ahora."
  ].filter(Boolean).join("\n");
  return { system, user };
}
function parseRecommendations(raw, catalog, fallbackHeadline) {
  const parsed = extractJson(raw) ?? {};
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const byTitle = new Map(catalog.map((item) => [item.title.toLowerCase(), item]));
  const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const recommendations = [];
  for (const entry2 of list) {
    if (!entry2 || typeof entry2 !== "object") continue;
    const record = entry2;
    const rawId = typeof record.productId === "string" ? record.productId.trim() : "";
    const rawTitle = typeof record.title === "string" ? record.title.trim() : "";
    const matched = byId.get(rawId) ?? byTitle.get(rawTitle.toLowerCase());
    if (!matched) continue;
    if (recommendations.some((item) => item.productId === matched.id)) continue;
    const confidence = Number(record.confidence);
    recommendations.push({
      productId: matched.id,
      title: matched.title,
      reason: typeof record.reason === "string" && record.reason.trim() ? truncate(record.reason, 200) : "Complementa bien este producto.",
      bundleIdea: typeof record.bundleIdea === "string" && record.bundleIdea.trim() ? truncate(record.bundleIdea, 160) : `Pack con ${matched.title}`,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.6
    });
    if (recommendations.length >= 4) break;
  }
  return {
    headline: typeof parsed.headline === "string" && parsed.headline.trim() ? truncate(parsed.headline, 140) : fallbackHeadline,
    recommendations
  };
}
function demoRecommendations(product, catalog, language = "es") {
  const isEnglish = language === "en";
  const productTags = new Set((product.tags ?? []).map((tag) => tag.toLowerCase()));
  const scored = catalog.filter((item) => item.id !== product.id).map((item) => {
    const shared = (item.tags ?? []).filter((tag) => productTags.has(tag.toLowerCase())).length;
    const sameType = item.type && item.type === product.productType ? 2 : 0;
    return { item, score: shared + sameType };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    headline: isEnglish ? `Complete the look with ${product.title}` : `Completa tu compra con ${product.title}`,
    recommendations: scored.map(({ item, score }, index) => ({
      productId: item.id,
      title: item.title,
      reason: isEnglish ? `${item.title} pairs naturally with ${product.title} and increases average order value.` : `${item.title} encaja de forma natural con ${product.title} y sube el ticket medio.`,
      bundleIdea: isEnglish ? `Bundle: ${product.title} + ${item.title}` : `Pack: ${product.title} + ${item.title}`,
      confidence: Math.min(0.95, 0.6 + score * 0.1 + index * 0.02)
    }))
  };
}
class AiError extends Error {
  constructor(message, code = "AI_ERROR") {
    super(message);
    __publicField(this, "code");
    this.name = "AiError";
    this.code = code;
  }
}
const PROVIDER_ENV_KEYS$1 = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  qwen: "QWEN_API_KEY"
};
const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  openrouter: "qwen/qwen-2.5-72b-instruct",
  qwen: "qwen-plus"
};
const OPENAI_COMPATIBLE_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
};
const MAX_TOKENS = 2e3;
const REQUEST_TIMEOUT_MS = 6e4;
function isProviderId(value) {
  return value === "demo" || value === "openai" || value === "anthropic" || value === "openrouter" || value === "qwen";
}
function resolveApiKey(config) {
  if (config.apiKey && config.apiKey.trim()) return config.apiKey.trim();
  if (config.provider === "demo") return null;
  const envKey = process.env[PROVIDER_ENV_KEYS$1[config.provider]];
  return envKey && envKey.trim() ? envKey.trim() : null;
}
function resolveModel(config) {
  if (config.model && config.model.trim()) return config.model.trim();
  if (config.provider === "demo") return "demo-v1";
  const envModel = process.env.AI_MODEL;
  if (envModel && envModel.trim()) return envModel.trim();
  return DEFAULT_MODELS[config.provider];
}
async function fetchWithTimeout(url, init) {
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
      "AI_NETWORK"
    );
  } finally {
    clearTimeout(timer);
  }
}
async function readErrorMessage(response) {
  try {
    const text = await response.text();
    const trimmed = text.slice(0, 400);
    return trimmed || response.statusText;
  } catch {
    return response.statusText;
  }
}
async function callOpenAiCompatible(baseUrl, apiKey, model, system, user, extraHeaders = {}) {
  var _a2, _b, _c, _d, _e;
  const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS
    })
  });
  if (!response.ok) {
    throw new AiError(
      `El proveedor de IA respondió ${response.status}: ${await readErrorMessage(response)}`,
      "AI_PROVIDER_ERROR"
    );
  }
  const data = await response.json();
  const text = ((_c = (_b = (_a2 = data.choices) == null ? void 0 : _a2[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) ?? "";
  if (!text.trim()) {
    throw new AiError("El proveedor de IA devolvió una respuesta vacía.", "AI_EMPTY");
  }
  return {
    text,
    tokensIn: ((_d = data.usage) == null ? void 0 : _d.prompt_tokens) ?? 0,
    tokensOut: ((_e = data.usage) == null ? void 0 : _e.completion_tokens) ?? 0
  };
}
async function callAnthropic(apiKey, model, system, user) {
  var _a2, _b;
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!response.ok) {
    throw new AiError(
      `Anthropic respondió ${response.status}: ${await readErrorMessage(response)}`,
      "AI_PROVIDER_ERROR"
    );
  }
  const data = await response.json();
  const text = (data.content ?? []).filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n");
  if (!text.trim()) {
    throw new AiError("Anthropic devolvió una respuesta vacía.", "AI_EMPTY");
  }
  return {
    text,
    tokensIn: ((_a2 = data.usage) == null ? void 0 : _a2.input_tokens) ?? 0,
    tokensOut: ((_b = data.usage) == null ? void 0 : _b.output_tokens) ?? 0
  };
}
async function dispatchCompletion(system, user, provider, apiKey, model, baseUrl) {
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
        "X-Title": "ShopGenius AI"
      }
    );
  }
  return callOpenAiCompatible(
    baseUrl || process.env.AI_BASE_URL || (provider === "qwen" ? OPENAI_COMPATIBLE_BASE_URLS.qwen : OPENAI_COMPATIBLE_BASE_URLS.openai),
    apiKey,
    model,
    system,
    user
  );
}
async function generateProductContent(product, options, config) {
  var _a2;
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
      demo: true
    };
  }
  const { system, user } = buildProductPrompt(product, options);
  const result = await dispatchCompletion(
    system,
    user,
    provider,
    apiKey,
    model,
    config.baseUrl
  );
  return {
    content: parseAiContent(result.text, {
      title: product.title,
      imageCount: Math.min(options.imageCount ?? ((_a2 = product.images) == null ? void 0 : _a2.length) ?? 0, 10)
    }),
    provider,
    model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    demo: false
  };
}
async function generateRecommendations(product, catalog, options, config) {
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
      demo: true
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
    demo: false
  };
}
const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1";
function getKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
  }
  const hash = crypto.createHash("sha256").update(trimmed).digest();
  return hash;
}
function isEncryptionConfigured() {
  return getKey() !== null;
}
function encryptSecret(plain) {
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}
function decryptSecret(stored) {
  if (!stored) return null;
  if (!stored.startsWith(`${PREFIX}:`)) return stored;
  const key = getKey();
  if (!key) return null;
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    return null;
  }
}
const DEFAULT_SHOP_SETTINGS = {
  plan: "FREE",
  aiProvider: "demo",
  defaultTone: "profesional",
  defaultLanguage: "es"
};
async function getShopSettings(shop) {
  const existing = await prisma.shopSettings.findUnique({ where: { shop } });
  if (existing) return existing;
  return prisma.shopSettings.create({
    data: {
      shop,
      ...DEFAULT_SHOP_SETTINGS,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3)
    }
  });
}
async function getShopQuota(shop) {
  const settings = await getShopSettings(shop);
  const plan = getPlan(settings.plan);
  const periodStart = currentPeriodStart();
  const [count, tokens] = await Promise.all([
    prisma.generation.count({ where: { shop, createdAt: { gte: periodStart } } }),
    prisma.generation.aggregate({
      where: { shop, createdAt: { gte: periodStart } },
      _sum: { tokensIn: true, tokensOut: true }
    })
  ]);
  const limit = resolveGenerationLimit(plan, settings.monthlyGenerationLimit);
  return {
    plan,
    planId: plan.id,
    used: count,
    limit,
    remaining: Math.max(0, limit - count),
    percent: limit > 0 ? Math.min(100, Math.round(count / limit * 100)) : 100,
    periodStart,
    tokensIn: tokens._sum.tokensIn ?? 0,
    tokensOut: tokens._sum.tokensOut ?? 0
  };
}
class QuotaExceededError extends Error {
  constructor(quota) {
    super(
      `Has alcanzado el límite de ${quota.limit} generaciones de tu plan ${quota.plan.name}. Mejora tu plan para seguir generando contenido.`
    );
    __publicField(this, "quota");
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}
async function assertQuota(shop) {
  const quota = await getShopQuota(shop);
  if (quota.remaining <= 0) throw new QuotaExceededError(quota);
  return quota;
}
function buildAiConfig(settings) {
  return {
    provider: isProviderId(settings.aiProvider) ? settings.aiProvider : "demo",
    model: settings.aiModel,
    apiKey: decryptSecret(settings.aiApiKeyEnc),
    baseUrl: process.env.AI_BASE_URL || null
  };
}
async function updateShopSettings(shop, data) {
  await getShopSettings(shop);
  const update = {
    aiProvider: data.aiProvider,
    aiModel: data.aiModel === "" ? null : data.aiModel,
    defaultTone: data.defaultTone,
    defaultLanguage: data.defaultLanguage,
    defaultKeywords: data.defaultKeywords,
    brandVoice: data.brandVoice,
    storeDescription: data.storeDescription,
    monthlyGenerationLimit: data.monthlyGenerationLimit ?? void 0,
    onboardedAt: data.onboardedAt ?? void 0
  };
  if (data.apiKey !== void 0 && data.apiKey !== null) {
    update.aiApiKeyEnc = data.apiKey.trim() ? encryptSecret(data.apiKey.trim()) : null;
  }
  Object.keys(update).forEach((key) => {
    if (update[key] === void 0) delete update[key];
  });
  return prisma.shopSettings.update({ where: { shop }, data: update });
}
async function setShopPlan(shop, planId, options = {}) {
  await getShopSettings(shop);
  return prisma.shopSettings.update({
    where: { shop },
    data: {
      plan: planId,
      subscriptionId: options.subscriptionId ?? null,
      subscriptionStatus: options.status ?? (planId === "FREE" ? "NONE" : "ACTIVE")
    }
  });
}
async function recordGeneration(params) {
  return prisma.generation.create({
    data: {
      shop: params.shop,
      type: params.type,
      productId: params.productId ?? null,
      productTitle: params.productTitle ?? null,
      provider: params.provider,
      model: params.model,
      inputJson: JSON.stringify(params.input),
      outputJson: JSON.stringify(params.output),
      tokensIn: params.tokensIn ?? 0,
      tokensOut: params.tokensOut ?? 0,
      shopSettingsId: params.shopSettingsId ?? null,
      applied: params.applied ?? false
    }
  });
}
async function markGenerationApplied(shop, generationId) {
  return prisma.generation.updateMany({
    where: { id: generationId, shop },
    data: { applied: true, appliedAt: /* @__PURE__ */ new Date() }
  });
}
function safeParseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
const action$c = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} para ${shop}`);
  const subscription = payload.app_subscription;
  await getShopSettings(shop);
  const status = ((subscription == null ? void 0 : subscription.status) ?? "").toUpperCase();
  const isInactive = ["CANCELLED", "EXPIRED", "DECLINED", "FROZEN"].includes(status);
  const plan = isInactive ? null : getPlanByBillingName(subscription == null ? void 0 : subscription.name);
  if (plan) {
    await setShopPlan(shop, plan.id, {
      subscriptionId: (subscription == null ? void 0 : subscription.admin_graphql_api_id) ?? null,
      status: (subscription == null ? void 0 : subscription.status) ?? "ACTIVE"
    });
  } else {
    await setShopPlan(shop, "FREE", { status: status || "NONE" });
  }
  return new Response(null, { status: 200 });
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c
}, Symbol.toStringTag, { value: "Module" }));
const action$b = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop}`, JSON.stringify(payload).slice(0, 500));
  const settings = await prisma.shopSettings.findUnique({ where: { shop } });
  if (settings) {
    console.log(
      `[GDPR] La tienda ${shop} no almacena datos de clientes; no hay datos que exportar.`
    );
  }
  return new Response(null, { status: 200 });
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b
}, Symbol.toStringTag, { value: "Module" }));
const action$a = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} para ${shop}`);
  const current = payload.current ?? [];
  if (session) {
    await prisma.session.update({
      where: { id: session.id },
      data: { scope: current.toString() }
    });
  }
  return new Response();
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a
}, Symbol.toStringTag, { value: "Module" }));
const action$9 = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop}: sin datos de clientes almacenados.`);
  await prisma.generation.count({ where: { shop } });
  return new Response(null, { status: 200 });
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9
}, Symbol.toStringTag, { value: "Module" }));
const action$8 = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} para ${shop}`);
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }
  await prisma.shopSettings.updateMany({
    where: { shop },
    data: { subscriptionId: null, subscriptionStatus: "UNINSTALLED" }
  });
  return new Response();
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8
}, Symbol.toStringTag, { value: "Module" }));
const action$7 = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop}: borrando datos de la tienda.`);
  await prisma.$transaction([
    prisma.generation.deleteMany({ where: { shop } }),
    prisma.shopSettings.deleteMany({ where: { shop } }),
    prisma.session.deleteMany({ where: { shop } })
  ]);
  return new Response(null, { status: 200 });
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"Avatar":{"label":"Avatar","labelWithInitials":"Avatar con las iniciales {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Cargando","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Sin completar","partiallyComplete":"Parcialmente completado","complete":"Completado"},"TONE_LABELS":{"info":"Información","success":"Logrado","warning":"Advertencia","attention":"Atención","new":"Nueva","critical":"Crítico","readOnly":"Solo lectura","enabled":"Activado"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Descartar notificación"},"Button":{"spinnerAccessibilityLabel":"Cargando"},"Common":{"checkbox":"casilla de verificación","undo":"Deshacer","cancel":"Cancelar","clear":"Borrar","close":"Cerrar","submit":"Enviar","more":"Más"},"ContextualSaveBar":{"save":"Guardar","discard":"Descartar"},"DataTable":{"sortAccessibilityLabel":"ordenar {direction} por","navAccessibilityLabel":"Desplázate en la tabla una columna {direction}","totalsRowHeading":"Totales","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Mostrar el mes anterior, {previousMonthName} {showPreviousYear}","nextMonth":"Mostrar el mes siguiente, {nextMonth} {nextYear}","today":"Hoy ","months":{"january":"enero","february":"febrero","march":"marzo","april":"abril","may":"mayo","june":"junio","july":"julio","august":"agosto","september":"septiembre","october":"octubre","november":"noviembre","december":"diciembre"},"daysAbbreviated":{"monday":"LU","tuesday":"MA","wednesday":"MI","thursday":"JU","friday":"VI","saturday":"SA","sunday":"DO"},"days":{"monday":"lunes","tuesday":"martes","wednesday":"miércoles","thursday":"jueves","friday":"viernes","saturday":"sábado","sunday":"domingo"},"start":"Inicio del intervalo","end":"Fin del intervalo"},"DiscardConfirmationModal":{"title":"Descartar todos los cambios no guardados","message":"Si descartas los cambios, se eliminará cualquier edición que hayas realizado desde la última vez que guardaste.","primaryAction":"Descartar los cambios","secondaryAction":"Continuar editando"},"DropZone":{"errorOverlayTextFile":"El tipo de archivo no es válido","errorOverlayTextImage":"El tipo de imagen no es válido","single":{"overlayTextFile":"Suelta el archivo que quieres cargar","overlayTextImage":"Suelta la imagen que quieres cargar","actionTitleFile":"Agregar archivo","actionTitleImage":"Agregar imagen","actionHintFile":"o suelta el archivo que quieres cargar","actionHintImage":"o suelta la imagen que quieres cargar","labelFile":"Cargar archivo","labelImage":"Cargar imagen","overlayTextVideo":"Arrastrar y soltar un video para subirlo","actionTitleVideo":"Agregar video","actionHintVideo":"o arrastrar y soltar un video para subirlo","labelVideo":"Subir video"},"allowMultiple":{"overlayTextFile":"Suelta los archivos que quieres cargar","overlayTextImage":"Suelta las imágenes que quieres cargar","actionTitleFile":"Agregar archivos","actionTitleImage":"Agregar imágenes","actionHintFile":"o suelta los archivos que quieres cargar","actionHintImage":"o suelta las imágenes que quieres cargar","labelFile":"Cargar archivos","labelImage":"Cargar imágenes","overlayTextVideo":"Arrastrar y soltar videos para subirlos","actionTitleVideo":"Agregar videos","actionHintVideo":"o arrastrar y soltar videos para subirlos","labelVideo":"Subir videos"},"errorOverlayTextVideo":"El tipo de video no es válido."},"EmptySearchResult":{"altText":"Resultados de búsqueda vacíos"},"Frame":{"skipToContent":"Ir directamente al contenido","Navigation":{"closeMobileNavigationLabel":"Cerrar la navegación"},"navigationLabel":"Navegación"},"ActionMenu":{"RollupActions":{"rollupButton":"Ver acciones"},"Actions":{"moreActions":"Más acciones"}},"Filters":{"moreFilters":"Más filtros","filter":"Filtrar {resourceName}","noFiltersApplied":"No hay filtros aplicados","cancel":"Cancelar","done":"Listo","clearAllFilters":"Borrar todos los filtros","clear":"Borrar","clearLabel":"Borrar {filterName}","moreFiltersWithCount":"Más filtros ({count})","addFilter":"Agregar filtro","clearFilters":"Borrar todo","searchInView":"en:{viewName}"},"Modal":{"iFrameTitle":"marcado body","modalWarning":"Faltan estas propiedades necesarias en Modal: {missingProps}"},"Pagination":{"previous":"Anterior","next":"Siguiente","pagination":"Paginación"},"ProgressBar":{"negativeWarningMessage":"Los valores pasados a la propiedad de progreso no pueden ser negativos. Restableciendo {progress} a 0","exceedWarningMessage":"Los valores pasados a la propiedad de progreso no deben ser superiores a 100. Configurar {progress} en 100."},"ResourceList":{"sortingLabel":"Ordenar por","defaultItemSingular":"artículo","defaultItemPlural":"artículos","showing":"Se muestran {itemsCount} {resource}","loading":"Cargando {resource}","selected":"Seleccionados: {selectedItemsCount}","allItemsSelected":"Los más de {itemsLength} {resourceNamePlural} de la tienda están seleccionados.","selectAllItems":"Seleccionar los más de {itemsLength} recursos de {resourceNamePlural} de la tienda","emptySearchResultTitle":"No se encontró ningún recurso de {resourceNamePlural}","emptySearchResultDescription":"Prueba a cambiar los filtros o el término de búsqueda","selectButtonText":"Seleccionar","a11yCheckboxDeselectAllSingle":"Deseleccionar {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Seleccionar {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deseleccionar {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Seleccionar {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Acciones para {accessibilityLabel}","actionsDropdown":"Menú desplegable de acciones","viewItem":"Ver detalles de {itemName}"},"BulkActions":{"actionsActivatorLabel":"Acciones","moreActionsActivatorLabel":"Más acciones"},"showingTotalCount":"Se muestran {itemsCount} de {totalItemsCount} {resource}","allFilteredItemsSelected":"Los más de {itemsLength} {resourceNamePlural} de este filtro están seleccionados.","selectAllFilteredItems":"Seleccionar los más de {itemsLength} recursos de {resourceNamePlural} de este filtro"},"SkeletonPage":{"loadingLabel":"Cargando página"},"Tabs":{"toggleTabsLabel":"Más vistas","newViewAccessibilityLabel":"Crear vista nueva","newViewTooltip":"Crear vista","Tab":{"rename":"Cambiar nombre de vista","duplicate":"Duplicar vista","edit":"Editar vista","editColumns":"Editar columnas","delete":"Eliminar vista","copy":"Copia de {name}","deleteModal":{"title":"¿Eliminar vista?","description":"Esta acción no se puede deshacer. La vista {viewName} ya no estará disponible en el panel de control.","cancel":"Cancelar","delete":"Eliminar vista"}},"RenameModal":{"title":"Renombrar vista","label":"Nombre","cancel":"Cancelar","create":"Guardar","errors":{"sameName":"Ya existe una vista con este nombre. Elige otro nombre."}},"DuplicateModal":{"title":"Duplicar vista","label":"Nombre","cancel":"Cancelar","create":"Crear vista","errors":{"sameName":"Ya existe una vista con este nombre. Elige otro nombre."}},"CreateViewModal":{"title":"Crear vista nueva","label":"Nombre","cancel":"Cancelar","create":"Crear vista","errors":{"sameName":"Ya existe una vista con este nombre. Elige otro nombre."}}},"Tag":{"ariaLabel":"Eliminar {children}"},"TextField":{"characterCount":"{count} caracteres","characterCountWithMaxLength":"{count} de {limit} caracteres utilizados"},"TopBar":{"toggleMenuLabel":"Abrir/cerrar menú","SearchField":{"clearButtonLabel":"Borrar","search":"Buscar"}},"MediaCard":{"popoverButton":"Acciones","dismissButton":"Descartar"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Reproducir el video","defaultWithDuration":"Reproducir video de {duration} de duración","duration":{"hours":{"other":{"only":"{hourCount} horas","andMinutes":"{hourCount} horas y {minuteCount} minutos","andMinute":"{hourCount} horas y {minuteCount} minuto","minutesAndSeconds":"{hourCount} horas, {minuteCount} minutos y {secondCount} segundos","minutesAndSecond":"{hourCount} horas, {minuteCount} minutos y {secondCount} segundo","minuteAndSeconds":"{hourCount} horas, {minuteCount} minuto y {secondCount} segundos","minuteAndSecond":"{hourCount} horas, {minuteCount} minuto y {secondCount} segundo","andSeconds":"{hourCount} horas y {secondCount} segundos","andSecond":"{hourCount} horas y {secondCount} segundo"},"one":{"only":"{hourCount} hora","andMinutes":"{hourCount} hora y {minuteCount} minutos","andMinute":"{hourCount} hora y {minuteCount} minuto","minutesAndSeconds":"{hourCount} hora, {minuteCount} minutos y {secondCount} segundos","minutesAndSecond":"{hourCount} hora, {minuteCount} minutos y {secondCount} segundo","minuteAndSeconds":"{hourCount} hora, {minuteCount} minuto y {secondCount} segundos","minuteAndSecond":"{hourCount} hora, {minuteCount} minuto y {secondCount} segundo","andSeconds":"{hourCount} hora y {secondCount} segundos","andSecond":"{hourCount} hora y {secondCount} segundo"}},"minutes":{"other":{"only":"{minuteCount} minutos","andSeconds":"{minuteCount} minutos y {secondCount} segundos","andSecond":"{minuteCount} minutos y {secondCount} segundo"},"one":{"only":"{minuteCount} minuto","andSeconds":"{minuteCount} minuto y {secondCount} segundos","andSecond":"{minuteCount} minuto y {secondCount} segundo"}},"seconds":{"other":"{secondCount} segundos","one":"{secondCount} segundo","many":"{secondCount} segundos"}}}},"Loading":{"label":"Barra de carga de la página"},"TooltipOverlay":{"accessibilityLabel":"Descripción emergente: {label}"},"IndexProvider":{"defaultItemSingular":"Artículo","defaultItemPlural":"Artículos","allItemsSelected":"Los más de {itemsLength} {resourceNamePlural} están seleccionados.","selected":"Seleccionados: {selectedItemsCount}","a11yCheckboxDeselectAllSingle":"Deseleccionar {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Seleccionar {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deseleccionar {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Seleccionar {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No se encontró ningún recurso de {resourceNamePlural}","emptySearchDescription":"Prueba a cambiar los filtros o el término de búsqueda","onboardingBadgeText":"Nuevo","resourceLoadingAccessibilityLabel":"Cargando {resourceNamePlural}...","selectAllLabel":"Seleccionar los recursos de {resourceNamePlural}","selected":"Seleccionados: {selectedItemsCount}","undo":"Deshacer","selectAllItems":"Seleccionar los más de {itemsLength} recursos de {resourceNamePlural}","selectItem":"Seleccionar {resourceName}","selectButtonText":"Seleccionar","sortAccessibilityLabel":"ordenar {direction} por"},"Page":{"Header":{"rollupActionsLabel":"Ver acciones para {title}","pageReadyAccessibilityLabel":"{title}. Esta página está lista"}},"FullscreenBar":{"back":"Atrás","accessibilityLabel":"Salir del modo de pantalla completa"},"FilterPill":{"clear":"Borrar"},"IndexFilters":{"searchFilterTooltip":"Buscar y filtrar","searchFilterTooltipWithShortcut":"Buscar y filtrar (F)","searchFilterAccessibilityLabel":"Buscar y filtrar resultados","sort":"Ordenar los resultados","addView":"Agregar una vista nueva","newView":"Búsqueda personalizada","SortButton":{"ariaLabel":"Ordenar los resultados","tooltip":"Ordenar","title":"Ordenar por","sorting":{"asc":"Ascendente","desc":"Descendente","az":"A-Z","za":"Z-A"}},"UpdateButtons":{"cancel":"Cancelar","update":"Modificar","save":"Guardar","saveAs":"Guardar como","modal":{"title":"Guardar vista como","label":"Nombre","sameName":"Ya existe una vista con este nombre. Elige otro nombre.","save":"Guardar","cancel":"Cancelar"}},"EditColumnsButton":{"tooltip":"Editar columnas","accessibilityLabel":"Personalizar el orden y la visibilidad de las columnas de la tabla"}},"ActionList":{"SearchField":{"clearButtonLabel":"Borrar","search":"Búsqueda","placeholder":"Buscar acciones"}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-CV7GIAUv.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Introduce el dominio de tu tienda" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Introduce un dominio de tienda válido" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$d = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$6 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Iniciar sesión en ShopGenius AI" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Dominio de la tienda",
        helpText: "ejemplo.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Entrar" })
  ] }) }) }) }) });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: Auth,
  links: links$1,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
const loader$c = async ({ request }) => {
  const url = new URL(request.url);
  return new Response(
    JSON.stringify({
      status: "ok",
      app: "ShopGenius AI",
      version: "1.0.0",
      apiVersion: process.env.SHOPIFY_API_VERSION ?? "2025-01",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      host: url.host
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const page = "_page_1a57n_1";
const header = "_header_1a57n_13";
const logo = "_logo_1a57n_21";
const pill = "_pill_1a57n_32";
const hero = "_hero_1a57n_42";
const tagline = "_tagline_1a57n_55";
const form = "_form_1a57n_63";
const label = "_label_1a57n_72";
const input = "_input_1a57n_82";
const hint = "_hint_1a57n_91";
const button = "_button_1a57n_96";
const grid = "_grid_1a57n_111";
const footer = "_footer_1a57n_142";
const styles = {
  page,
  header,
  logo,
  pill,
  hero,
  tagline,
  form,
  label,
  input,
  hint,
  button,
  grid,
  footer
};
const loader$b = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};
function LandingPage() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsxs("main", { className: styles.page, children: [
    /* @__PURE__ */ jsxs("header", { className: styles.header, children: [
      /* @__PURE__ */ jsxs("span", { className: styles.logo, children: [
        "ShopGenius",
        /* @__PURE__ */ jsx("span", { children: "AI" })
      ] }),
      /* @__PURE__ */ jsx("span", { className: styles.pill, children: "Disponible en la Shopify App Store" })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: styles.hero, children: [
      /* @__PURE__ */ jsx("h1", { children: "Tu catálogo, optimizado por IA en minutos." }),
      /* @__PURE__ */ jsx("p", { className: styles.tagline, children: "Descripciones que venden, metadatos SEO perfectos, alt text para cada imagen y recomendaciones cruzadas. Todo dentro de tu panel de Shopify, desde 49 €/mes." }),
      showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
        /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
          /* @__PURE__ */ jsx("span", { children: "Dominio de tu tienda" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: styles.input,
              type: "text",
              name: "shop",
              placeholder: "mi-tienda.myshopify.com"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: styles.hint, children: "ej. mi-tienda.myshopify.com" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Instalar en mi tienda" })
      ] }),
      /* @__PURE__ */ jsxs("ul", { className: styles.grid, children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Descripciones que convierten" }),
          /* @__PURE__ */ jsx("span", { children: "Contenido con beneficios, bullets y llamada a la acción en tu tono de marca." })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "SEO sin esfuerzo" }),
          /* @__PURE__ */ jsx("span", { children: "Meta títulos, meta descripciones y etiquetas listas para Google, con validación de longitud." })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Alt text automático" }),
          /* @__PURE__ */ jsx("span", { children: "Mejora accesibilidad y posicionamiento en Google Imágenes para todo el catálogo." })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Recomendaciones con IA" }),
          /* @__PURE__ */ jsx("span", { children: "Cross-sell inteligente basado en tu catálogo real y en el producto que ve el cliente." })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Pago a través de Shopify" }),
          /* @__PURE__ */ jsx("span", { children: "49 €/mes con 7 días de prueba, facturado en tu cuenta de Shopify. Sin tarjetas fuera de Shopify." })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Instalación en 1 clic" }),
          /* @__PURE__ */ jsx("span", { children: "Sin código, sin migraciones: se instala dentro de tu admin y funciona con tus productos." })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("footer", { className: styles.footer, children: [
      /* @__PURE__ */ jsx("span", { children: "ShopGenius AI · SaaS para Shopify" }),
      /* @__PURE__ */ jsx("span", { children: "Hecho con Remix, Polaris y Shopify Admin API" })
    ] })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: LandingPage,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const loader$a = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$9 = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsxs(NavMenu, { children: [
      /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Panel" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/products", children: "Productos" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/bulk", children: "Generación masiva" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/seo", children: "Auditoría SEO" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/recommendations", children: "Recomendaciones" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/history", children: "Historial" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/billing", children: "Plan y facturación" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/settings", children: "Ajustes" })
    ] }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const PRODUCT_FRAGMENT = `#graphql
  fragment ShopGeniusProduct on Product {
    id
    title
    handle
    status
    productType
    vendor
    tags
    descriptionHtml
    updatedAt
    seo { title description }
    featuredImage { url altText }
    images(first: 8) { nodes { id url altText } }
    variants(first: 15) { nodes { id title price sku } }
    priceRangeV2 { minVariantPrice { amount currencyCode } }
  }
`;
function mapProduct(product) {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType ?? null,
    vendor: product.vendor ?? null,
    tags: product.tags ?? [],
    descriptionHtml: product.descriptionHtml ?? "",
    updatedAt: product.updatedAt,
    seoTitle: ((_a2 = product.seo) == null ? void 0 : _a2.title) ?? null,
    seoDescription: ((_b = product.seo) == null ? void 0 : _b.description) ?? null,
    images: (((_c = product.images) == null ? void 0 : _c.nodes) ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText
    })),
    variants: (((_d = product.variants) == null ? void 0 : _d.nodes) ?? []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      sku: variant.sku
    })),
    price: ((_f = (_e = product.priceRangeV2) == null ? void 0 : _e.minVariantPrice) == null ? void 0 : _f.amount) ?? null,
    currency: ((_h = (_g = product.priceRangeV2) == null ? void 0 : _g.minVariantPrice) == null ? void 0 : _h.currencyCode) ?? null
  };
}
async function listProducts(admin, options = {}) {
  var _a2, _b, _c, _d, _e, _f;
  const first = Math.min(Math.max(options.first ?? 25, 1), 100);
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
          edges { node { ...ShopGeniusProduct } }
          pageInfo { hasNextPage endCursor }
        }
      }
      ${PRODUCT_FRAGMENT}`,
    { variables: { first, after: options.after ?? null, query: ((_a2 = options.query) == null ? void 0 : _a2.trim()) || null } }
  );
  const json = await response.json();
  if ((_b = json.errors) == null ? void 0 : _b.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  return {
    products: (((_d = (_c = json.data) == null ? void 0 : _c.products) == null ? void 0 : _d.edges) ?? []).map((edge) => mapProduct(edge.node)),
    pageInfo: ((_f = (_e = json.data) == null ? void 0 : _e.products) == null ? void 0 : _f.pageInfo) ?? { hasNextPage: false, endCursor: null }
  };
}
async function getProduct(admin, id) {
  var _a2, _b;
  const normalizedId = id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`;
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProduct($id: ID!) {
        product(id: $id) { ...ShopGeniusProduct }
      }
      ${PRODUCT_FRAGMENT}`,
    { variables: { id: normalizedId } }
  );
  const json = await response.json();
  if ((_a2 = json.errors) == null ? void 0 : _a2.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  return ((_b = json.data) == null ? void 0 : _b.product) ? mapProduct(json.data.product) : null;
}
async function countProducts(admin) {
  var _a2, _b;
  const response = await admin.graphql(
    `#graphql
      query ShopGeniusProductsCount { productsCount { count } }`
  );
  const json = await response.json();
  return ((_b = (_a2 = json.data) == null ? void 0 : _a2.productsCount) == null ? void 0 : _b.count) ?? 0;
}
async function updateProductContent(admin, input2) {
  var _a2, _b, _c, _d;
  const productInput = { id: input2.id };
  if (typeof input2.descriptionHtml === "string") {
    productInput.descriptionHtml = input2.descriptionHtml;
  }
  if (input2.seoTitle || input2.seoDescription) {
    productInput.seo = {
      title: input2.seoTitle ?? null,
      description: input2.seoDescription ?? null
    };
  }
  if (input2.tags) {
    productInput.tags = input2.tags;
  }
  const response = await admin.graphql(
    `#graphql
      mutation ShopGeniusProductUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id title seo { title description } tags descriptionHtml }
          userErrors { field message }
        }
      }`,
    { variables: { input: productInput } }
  );
  const json = await response.json();
  const errors = [
    ...((_a2 = json.errors) == null ? void 0 : _a2.map((error) => error.message)) ?? [],
    ...((_d = (_c = (_b = json.data) == null ? void 0 : _b.productUpdate) == null ? void 0 : _c.userErrors) == null ? void 0 : _d.map((error) => error.message)) ?? []
  ];
  return { ok: errors.length === 0, errors };
}
async function updateImageAltTexts(admin, images) {
  var _a2, _b, _c, _d;
  if (images.length === 0) return { ok: true, errors: [] };
  const response = await admin.graphql(
    `#graphql
      mutation ShopGeniusFileUpdate($files: [FileUpdateInput!]!) {
        fileUpdate(files: $files) {
          files {
            ... on MediaImage { id alt }
          }
          userErrors { field message }
        }
      }`,
    { variables: { files: images.map((image) => ({ id: image.id, alt: image.alt })) } }
  );
  const json = await response.json();
  const errors = [
    ...((_a2 = json.errors) == null ? void 0 : _a2.map((error) => error.message)) ?? [],
    ...((_d = (_c = (_b = json.data) == null ? void 0 : _b.fileUpdate) == null ? void 0 : _c.userErrors) == null ? void 0 : _d.map((error) => error.message)) ?? []
  ];
  return { ok: errors.length === 0, errors };
}
const loader$8 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);
  const { products } = await listProducts(admin, { first: 50 });
  return {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      productType: product.productType,
      tags: product.tags,
      price: product.price
    })),
    defaults: { tone: settings.defaultTone, language: settings.defaultLanguage },
    provider: settings.aiProvider,
    quota: { remaining: quota.remaining, limit: quota.limit, planName: quota.plan.name }
  };
};
const action$5 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");
  try {
    if (!productId) return { ok: false, error: "Selecciona un producto principal." };
    const quota = await assertQuota(shop);
    const settings = await getShopSettings(shop);
    const product = await getProduct(admin, productId);
    if (!product) return { ok: false, error: "Producto no encontrado." };
    const catalogResult = await listProducts(admin, { first: 50 });
    const catalog = catalogResult.products.filter((item) => item.id !== product.id && item.status === "ACTIVE").map((item) => ({
      id: item.id,
      title: item.title,
      type: item.productType,
      price: item.price,
      tags: item.tags
    }));
    if (catalog.length === 0) {
      return { ok: false, error: "Necesitas al menos otro producto activo para generar recomendaciones." };
    }
    const language = String(formData.get("language") ?? settings.defaultLanguage);
    const tone = String(formData.get("tone") ?? settings.defaultTone);
    const aiResult = await generateRecommendations(
      {
        id: product.id,
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        price: product.price,
        images: product.images
      },
      catalog,
      {
        tone,
        language,
        storeDescription: settings.storeDescription ?? void 0,
        brandVoice: settings.brandVoice ?? void 0
      },
      buildAiConfig(settings)
    );
    await recordGeneration({
      shop,
      type: "PRODUCT_RECOMMENDATIONS",
      productId: product.id,
      productTitle: product.title,
      provider: aiResult.provider,
      model: aiResult.model,
      input: { productId: product.id, language, tone, catalogSize: catalog.length },
      output: aiResult.result,
      tokensIn: aiResult.tokensIn,
      tokensOut: aiResult.tokensOut,
      shopSettingsId: settings.id
    });
    return {
      ok: true,
      productId: product.id,
      productTitle: product.title,
      result: aiResult.result,
      demo: aiResult.demo,
      remaining: Math.max(0, quota.remaining - 1)
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    if (error instanceof AiError) return { ok: false, error: error.message, code: error.code };
    console.error("Error generando recomendaciones", error);
    return { ok: false, error: "No se pudieron generar las recomendaciones." };
  }
};
function RecommendationsPage() {
  var _a2;
  const { products, defaults, provider, quota } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const [productId, setProductId] = useState(((_a2 = products[0]) == null ? void 0 : _a2.id) ?? "");
  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);
  const loading = fetcher.state !== "idle";
  const data = fetcher.data;
  const error = data && !data.ok ? data : null;
  const success = data && data.ok ? data : null;
  useEffect(() => {
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [error, shopify2]);
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Recomendaciones con IA",
      subtitle: "Cross-sell basado en tu catálogo real, listo para copiar a tu tienda",
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Recomendaciones" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (error == null ? void 0 : error.code) === "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Sin generaciones disponibles", action: { content: "Ver planes", url: "/app/billing" }, children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          error && error.code !== "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "No se pudo generar", children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          (success == null ? void 0 : success.demo) && /* @__PURE__ */ jsx(Banner, { tone: "info", title: "Recomendaciones demo", children: /* @__PURE__ */ jsx("p", { children: "Generadas sin proveedor de IA a partir de etiquetas y tipos de producto. Configura tu API key para recomendaciones más precisas." }) }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Configurar recomendaciones" }),
                /* @__PURE__ */ jsxs(FormLayout, { children: [
                  /* @__PURE__ */ jsx(
                    Select,
                    {
                      label: "Producto principal",
                      options: products.map((product) => ({
                        label: product.title,
                        value: product.id
                      })),
                      value: productId,
                      onChange: setProductId,
                      disabled: products.length === 0
                    }
                  ),
                  /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Tono",
                        options: TONES.map((value) => ({ label: value, value })),
                        value: tone,
                        onChange: setTone
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Idioma",
                        options: LANGUAGES.map((item) => ({ label: item.label, value: item.code })),
                        value: language,
                        onChange: setLanguage
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    quota.remaining,
                    " generaciones disponibles · Proveedor: ",
                    provider
                  ] }),
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "productId", value: productId }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "tone", value: tone }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "language", value: language }),
                    /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading, disabled: !productId, children: "Generar recomendaciones" })
                  ] })
                ] })
              ] }) }),
              success && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: success.result.headline }),
                  /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                    "Basado en «",
                    success.productTitle,
                    "» · quedan ",
                    success.remaining,
                    " generaciones"
                  ] })
                ] }),
                /* @__PURE__ */ jsx(Divider, {}),
                success.result.recommendations.length === 0 ? /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "No se han encontrado productos complementarios en el catálogo." }) : success.result.recommendations.map((recommendation) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                    /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: recommendation.title }),
                    /* @__PURE__ */ jsx(Badge, { tone: "success", children: `${Math.round(recommendation.confidence * 100)}% afinidad` })
                  ] }),
                  /* @__PURE__ */ jsx(ProgressBar, { progress: Math.round(recommendation.confidence * 100) }),
                  /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: recommendation.reason }),
                  /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: recommendation.bundleIdea }),
                  /* @__PURE__ */ jsx(InlineStack, { gap: "200", children: /* @__PURE__ */ jsx(
                    Button,
                    {
                      url: `/app/products/${recommendation.productId.split("/").pop()}`,
                      size: "slim",
                      children: "Optimizar este producto"
                    }
                  ) })
                ] }) }, recommendation.productId))
              ] }) })
            ] }) }),
            /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Cómo usarlo" }),
                /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Copia la idea de pack en las descripciones, crea una colección «Combina con…» o úsala en tu sección de productos recomendados." }),
                /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "La IA solo elige productos de tu catálogo activo, nunca inventa referencias." })
              ] }) }),
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Plan actual" }),
                /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
                  quota.planName,
                  " · ",
                  quota.limit,
                  " generaciones/mes"
                ] }),
                /* @__PURE__ */ jsx(Button, { url: "/app/billing", variant: "plain", children: "Mejorar plan" })
              ] }) })
            ] }) })
          ] })
        ] })
      ]
    }
  );
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: RecommendationsPage,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const loader$7 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const after = url.searchParams.get("after") ?? null;
  const result = await listProducts(admin, { first: 25, after, query });
  return {
    query,
    after,
    products: result.products.map((product) => {
      const audit = auditProduct({
        id: product.id,
        title: product.title,
        descriptionHtml: product.descriptionHtml,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        tags: product.tags,
        productType: product.productType,
        images: product.images,
        variants: product.variants
      });
      return {
        id: product.id,
        title: product.title,
        status: product.status,
        productType: product.productType,
        price: product.price,
        currency: product.currency,
        images: product.images.length,
        updatedAt: product.updatedAt,
        score: audit.score,
        issueCount: audit.issues.length
      };
    }),
    pageInfo: result.pageInfo
  };
};
function ProductsPage() {
  const { products, query, pageInfo, after } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);
  const goToPage = (after2) => {
    const next = new URLSearchParams(searchParams);
    if (after2) next.set("after", after2);
    else next.delete("after");
    setSearchParams(next);
  };
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Productos" }),
    /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "end", wrap: true, children: [
        /* @__PURE__ */ jsx(Form, { method: "get", style: { flex: 1, minWidth: 280 }, children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "end", children: [
          /* @__PURE__ */ jsx(Box, { minWidth: "280px", children: /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Buscar producto",
              labelHidden: true,
              name: "q",
              placeholder: "Busca por título, SKU o etiqueta…",
              value: searchValue,
              onChange: setSearchValue,
              autoComplete: "off",
              clearButton: true
            }
          ) }),
          /* @__PURE__ */ jsx(Button, { submit: true, children: "Buscar" })
        ] }) }),
        /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
          products.length,
          " productos en esta página"
        ] })
      ] }),
      /* @__PURE__ */ jsx(Divider, {}),
      products.length === 0 ? /* @__PURE__ */ jsx(
        EmptyState,
        {
          heading: "No hay productos que coincidan",
          image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
          children: /* @__PURE__ */ jsx("p", { children: "Prueba con otra búsqueda o crea productos en tu tienda." })
        }
      ) : /* @__PURE__ */ jsx(BlockStack, { gap: "0", children: products.map((product) => /* @__PURE__ */ jsx(Box, { paddingBlock: "300", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", gap: "300", wrap: true, children: [
        /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: product.title }),
          /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
            product.productType ?? "Sin tipo",
            " ·",
            " ",
            product.price ? `${product.price} ${product.currency ?? ""}` : "Sin precio",
            " ·",
            " ",
            product.images,
            " imágenes ·",
            " ",
            new Date(product.updatedAt).toLocaleDateString("es-ES")
          ] })
        ] }),
        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
          /* @__PURE__ */ jsx(Badge, { tone: product.score >= 80 ? "success" : product.score >= 50 ? "attention" : "critical", children: `SEO ${product.score}` }),
          product.issueCount > 0 && /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
            product.issueCount,
            " avisos"
          ] }),
          /* @__PURE__ */ jsx(Button, { url: `/app/products/${product.id.split("/").pop()}`, children: "Optimizar" })
        ] })
      ] }) }, product.id)) }),
      /* @__PURE__ */ jsx(Divider, {}),
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
        /* @__PURE__ */ jsx(Button, { disabled: !after, onClick: () => goToPage(null), children: "Volver al inicio" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            disabled: !pageInfo.hasNextPage,
            onClick: () => goToPage(pageInfo.endCursor),
            children: "Siguiente página"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ProductsPage,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const loader$6 = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const id = params.id ?? "";
  const product = await getProduct(admin, id);
  if (!product) {
    throw new Response("Producto no encontrado", { status: 404 });
  }
  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);
  const history = await prisma.generation.findMany({
    where: { shop: session.shop, productId: product.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  return {
    product,
    defaults: {
      tone: settings.defaultTone,
      language: settings.defaultLanguage,
      keywords: settings.defaultKeywords ?? "",
      brandVoice: settings.brandVoice ?? ""
    },
    provider: settings.aiProvider,
    quota: serializeQuota(quota),
    history: history.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      applied: item.applied,
      provider: item.provider
    }))
  };
};
function serializeQuota(quota) {
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    percent: quota.percent,
    planName: quota.plan.name
  };
}
const action$4 = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "generate");
  try {
    if (intent === "apply") {
      const generationId = String(formData.get("generationId") ?? "");
      const generation2 = await prisma.generation.findFirst({
        where: { id: generationId, shop }
      });
      if (!generation2) {
        return { ok: false, error: "No se encontró la generación solicitada." };
      }
      const content = safeParseJson(generation2.outputJson, null);
      if (!content) {
        return { ok: false, error: "El contenido guardado no es válido." };
      }
      const productId2 = generation2.productId ?? params.id ?? "";
      const product2 = await getProduct(admin, productId2);
      if (!product2) {
        return { ok: false, error: "El producto ya no existe en Shopify." };
      }
      const warnings = [];
      const update = await updateProductContent(admin, {
        id: product2.id,
        descriptionHtml: content.descriptionHtml,
        seoTitle: content.metaTitle,
        seoDescription: content.metaDescription,
        tags: content.tags
      });
      if (!update.ok) warnings.push(...update.errors);
      if (content.altTexts.length > 0) {
        const images = product2.images.slice(0, content.altTexts.length).map((image, index) => ({ id: image.id, alt: content.altTexts[index] ?? image.altText ?? "" })).filter((image) => image.id.startsWith("gid://"));
        if (images.length > 0) {
          const altResult = await updateImageAltTexts(admin, images);
          if (!altResult.ok) {
            warnings.push(
              `No se pudieron actualizar los alt text: ${altResult.errors.join(", ")}`
            );
          }
        }
      }
      if (update.ok) {
        await markGenerationApplied(shop, generation2.id);
      }
      return { ok: true, intent: "apply", generationId: generation2.id, warnings };
    }
    const productId = String(formData.get("productId") ?? params.id ?? "");
    const product = await getProduct(admin, productId);
    if (!product) {
      return { ok: false, error: "Producto no encontrado en Shopify." };
    }
    const quota = await assertQuota(shop);
    const tone = String(formData.get("tone") ?? "profesional");
    const language = String(formData.get("language") ?? "es");
    const keywords = String(formData.get("keywords") ?? "").split(",").map((keyword) => keyword.trim()).filter(Boolean);
    const targetAudience = String(formData.get("targetAudience") ?? "").trim();
    const instructions = String(formData.get("instructions") ?? "").trim();
    const settings = await getShopSettings(shop);
    const imageCount = Math.min(product.images.length, 5);
    const result = await generateProductContent(
      {
        id: product.id,
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        price: product.price,
        currentDescription: product.descriptionHtml,
        variants: product.variants.map((variant) => `${variant.title} (${variant.price})`),
        images: product.images
      },
      {
        tone,
        language,
        keywords,
        targetAudience,
        instructions,
        brandVoice: settings.brandVoice ?? void 0,
        storeDescription: settings.storeDescription ?? void 0,
        imageCount
      },
      buildAiConfig(settings)
    );
    const score = scoreSeoContent(result.content).score;
    const generation = await recordGeneration({
      shop,
      type: "PRODUCT_DESCRIPTION",
      productId: product.id,
      productTitle: product.title,
      provider: result.provider,
      model: result.model,
      input: { productId: product.id, tone, language, keywords, targetAudience, instructions },
      output: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      shopSettingsId: settings.id
    });
    return {
      ok: true,
      intent: "generate",
      generationId: generation.id,
      content: result.content,
      score,
      provider: result.provider,
      model: result.model,
      demo: result.demo,
      remaining: Math.max(0, quota.remaining - 1),
      limit: quota.limit
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    }
    if (error instanceof AiError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("Error generando contenido", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado generando el contenido."
    };
  }
};
function ProductDetailPage() {
  var _a2, _b, _c, _d;
  const { product, defaults, quota, provider, history } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);
  const [keywords, setKeywords] = useState(defaults.keywords);
  const [targetAudience, setTargetAudience] = useState("");
  const [instructions, setInstructions] = useState("");
  const generated = ((_a2 = fetcher.data) == null ? void 0 : _a2.ok) && fetcher.data.intent === "generate" ? fetcher.data : null;
  const applied = ((_b = fetcher.data) == null ? void 0 : _b.ok) && fetcher.data.intent === "apply" ? fetcher.data : null;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;
  const isGenerating = fetcher.state !== "idle" && ((_c = fetcher.formData) == null ? void 0 : _c.get("intent")) === "generate";
  const isApplying = fetcher.state !== "idle" && ((_d = fetcher.formData) == null ? void 0 : _d.get("intent")) === "apply";
  const score = useMemo(() => {
    if (!generated) return null;
    return scoreSeoContent(generated.content);
  }, [generated]);
  useEffect(() => {
    if (applied) {
      if (applied.warnings.length > 0) {
        shopify2.toast.show("Aplicado con avisos: revisa el detalle", { isError: true });
      } else {
        shopify2.toast.show("Contenido publicado en Shopify");
      }
    }
  }, [applied, shopify2]);
  useEffect(() => {
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [error, shopify2]);
  const quotaLeft = generated ? generated.remaining : quota.remaining;
  const quotaLimit = generated ? generated.limit : quota.limit;
  const quotaPercent = quotaLimit > 0 ? Math.min(100, Math.round((quotaLimit - quotaLeft) / quotaLimit * 100)) : 100;
  return /* @__PURE__ */ jsxs(
    Page,
    {
      backAction: { url: "/app/products" },
      title: product.title,
      subtitle: `${product.productType ?? "Producto"}${product.vendor ? ` · ${product.vendor}` : ""}${product.price ? ` · ${product.price} ${product.currency ?? ""}` : ""}`,
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Optimizar producto" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (error == null ? void 0 : error.code) === "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(
            Banner,
            {
              tone: "critical",
              title: "Límite de generaciones alcanzado",
              action: { content: "Ver planes", url: "/app/billing" },
              children: /* @__PURE__ */ jsx("p", { children: error.error })
            }
          ),
          error && error.code !== "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "No se pudo completar la operación", children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          (generated == null ? void 0 : generated.demo) && /* @__PURE__ */ jsx(Banner, { tone: "info", title: "Contenido demo", children: /* @__PURE__ */ jsx("p", { children: "No hay proveedor de IA configurado, así que se ha generado contenido de ejemplo. Configura tu API key en Ajustes para contenido real." }) }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Generar contenido con IA" }),
                /* @__PURE__ */ jsxs(FormLayout, { children: [
                  /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Tono",
                        options: TONES.map((value) => ({ label: value, value })),
                        value: tone,
                        onChange: setTone
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Idioma",
                        options: LANGUAGES.map((item) => ({ label: item.label, value: item.code })),
                        value: language,
                        onChange: setLanguage
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Palabras clave objetivo",
                      value: keywords,
                      onChange: setKeywords,
                      autoComplete: "off",
                      helpText: "Separadas por comas. Ej: mochila impermeable, mochila 25l"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Público objetivo (opcional)",
                      value: targetAudience,
                      onChange: setTargetAudience,
                      autoComplete: "off",
                      placeholder: "Ej: excursionistas urbanos de 25-40 años"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Instrucciones adicionales (opcional)",
                      value: instructions,
                      onChange: setInstructions,
                      autoComplete: "off",
                      multiline: 2,
                      placeholder: "Ej: destaca la garantía de 2 años y evita mencionar envíos"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    quotaLeft,
                    " de ",
                    quotaLimit,
                    " generaciones disponibles · Proveedor: ",
                    provider
                  ] }),
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "generate" }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "productId", value: product.id }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "tone", value: tone }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "language", value: language }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "keywords", value: keywords }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "targetAudience", value: targetAudience }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "instructions", value: instructions }),
                    /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading: isGenerating, disabled: quotaLeft <= 0, children: isGenerating ? "Generando…" : "Generar con IA" })
                  ] })
                ] })
              ] }) }),
              generated && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Resultado generado" }),
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                    /* @__PURE__ */ jsx(Badge, { tone: generated.score >= 80 ? "success" : generated.score >= 50 ? "attention" : "critical", children: `SEO ${generated.score}/100` }),
                    /* @__PURE__ */ jsx(Badge, { children: generated.provider })
                  ] })
                ] }),
                score && /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Puntuación del contenido" }),
                  /* @__PURE__ */ jsx(ProgressBar, { progress: score.score })
                ] }),
                /* @__PURE__ */ jsx(Divider, {}),
                /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Descripción" }),
                  /* @__PURE__ */ jsx(
                    Box,
                    {
                      padding: "400",
                      background: "bg-surface-secondary",
                      borderRadius: "200",
                      borderWidth: "025",
                      borderColor: "border",
                      children: /* @__PURE__ */ jsx(
                        "div",
                        {
                          dangerouslySetInnerHTML: { __html: sanitizeHtml(generated.content.descriptionHtml) }
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "HTML de la descripción",
                      labelHidden: true,
                      value: generated.content.descriptionHtml,
                      readOnly: true,
                      multiline: 4,
                      autoComplete: "off",
                      helpText: "Este es el HTML que se publicará. Puedes copiarlo si quieres editarlo antes."
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: `Meta título (${generated.content.metaTitle.length}/60)`,
                      value: generated.content.metaTitle,
                      readOnly: true,
                      autoComplete: "off"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: `Meta descripción (${generated.content.metaDescription.length}/160)`,
                      value: generated.content.metaDescription,
                      readOnly: true,
                      autoComplete: "off",
                      multiline: 2
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Etiquetas propuestas" }),
                  /* @__PURE__ */ jsx(InlineStack, { gap: "150", wrap: true, children: generated.content.tags.map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, tag)) })
                ] }),
                generated.content.altTexts.length > 0 && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Alt text de imágenes" }),
                  /* @__PURE__ */ jsx(List, { type: "bullet", children: generated.content.altTexts.map((alt, index) => /* @__PURE__ */ jsx(List.Item, { children: alt }, `${alt}-${index}`)) })
                ] }),
                generated.content.bulletPoints.length > 0 && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingSm", children: "Bullets de venta" }),
                  /* @__PURE__ */ jsx(List, { type: "bullet", children: generated.content.bulletPoints.map((bullet, index) => /* @__PURE__ */ jsx(List.Item, { children: bullet }, `${bullet}-${index}`)) })
                ] }),
                /* @__PURE__ */ jsx(Divider, {}),
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                      /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "apply" }),
                      /* @__PURE__ */ jsx("input", { type: "hidden", name: "generationId", value: generated.generationId }),
                      /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading: isApplying, children: "Aplicar a Shopify" })
                    ] }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        url: `shopify:admin/products/${product.id.split("/").pop()}`,
                        target: "_blank",
                        variant: "plain",
                        children: "Ver en Shopify"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Se actualizan descripción, SEO, etiquetas y alt text." })
                ] }),
                applied && applied.warnings.length > 0 && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Publicado con avisos", children: /* @__PURE__ */ jsx(List, { children: applied.warnings.map((warning) => /* @__PURE__ */ jsx(List.Item, { children: warning }, warning)) }) })
              ] }) })
            ] }) }),
            /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Consumo" }),
                /* @__PURE__ */ jsx(ProgressBar, { progress: quotaPercent, tone: quotaPercent >= 90 ? "critical" : "primary" }),
                /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                  "Plan ",
                  quota.planName,
                  " · ",
                  quotaLeft,
                  " restantes"
                ] }),
                /* @__PURE__ */ jsx(Button, { url: "/app/billing", variant: "plain", children: "Ver planes" })
              ] }) }),
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(Text, { as: "h2", variant: "headingMd", children: [
                  "Imágenes (",
                  product.images.length,
                  ")"
                ] }),
                product.images.slice(0, 4).map((image) => /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: image.url,
                      alt: image.altText ?? product.title,
                      width: 44,
                      height: 44,
                      style: { borderRadius: 8, objectFit: "cover" }
                    }
                  ),
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: image.altText ? void 0 : "subdued", children: image.altText ?? "Sin alt text" })
                ] }, image.id))
              ] }) }),
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Historial del producto" }),
                history.length === 0 ? /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Aún no hay generaciones para este producto." }) : history.map((item) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", children: new Date(item.createdAt).toLocaleString("es-ES") }),
                  /* @__PURE__ */ jsx(Badge, { tone: item.applied ? "success" : void 0, children: item.applied ? "Aplicado" : "Borrador" })
                ] }, item.id))
              ] }) })
            ] }) })
          ] })
        ] })
      ]
    }
  );
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: ProductDetailPage,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const PROVIDER_LABELS = {
  demo: "Modo demo (sin coste)",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  openrouter: "OpenRouter (Qwen, Llama, etc.)",
  qwen: "Qwen (Alibaba DashScope)"
};
const PROVIDER_ENV_KEYS = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  qwen: "QWEN_API_KEY"
};
const PROVIDERS = ["demo", "openai", "anthropic", "openrouter", "qwen"];
const loader$5 = async ({ request }) => {
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
      storeDescription: settings.storeDescription ?? ""
    },
    encryptionConfigured: isEncryptionConfigured(),
    envKeyAvailable: PROVIDER_ENV_KEYS,
    quota: { planName: quota.plan.name, remaining: quota.remaining, limit: quota.limit }
  };
};
const action$3 = async ({ request }) => {
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
      apiKey: clearKey ? null : typeof apiKey === "string" && apiKey.trim() ? apiKey : void 0,
      defaultTone: String(formData.get("defaultTone") ?? "profesional"),
      defaultLanguage: String(formData.get("defaultLanguage") ?? "es"),
      defaultKeywords: String(formData.get("defaultKeywords") ?? "").trim() || null,
      brandVoice: String(formData.get("brandVoice") ?? "").trim() || null,
      storeDescription: String(formData.get("storeDescription") ?? "").trim() || null
    });
    return { ok: true };
  } catch (error) {
    console.error("Error guardando ajustes", error);
    return { ok: false, error: "No se pudieron guardar los ajustes." };
  }
};
function SettingsPage() {
  const { settings, encryptionConfigured, envKeyAvailable, quota } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
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
    if (data == null ? void 0 : data.ok) shopify2.toast.show("Ajustes guardados");
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [data, error, shopify2]);
  return /* @__PURE__ */ jsxs(Page, { title: "Ajustes", subtitle: "Configura tu motor de IA y la voz de tu marca", children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Ajustes" }),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      (data == null ? void 0 : data.ok) && /* @__PURE__ */ jsx(Banner, { tone: "success", title: "Ajustes guardados", children: /* @__PURE__ */ jsx("p", { children: "Los cambios se aplicarán en la próxima generación." }) }),
      error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Error al guardar", children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
      !encryptionConfigured && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Cifrado no configurado", children: /* @__PURE__ */ jsx("p", { children: "Define APP_ENCRYPTION_KEY en el servidor para cifrar las API keys de tus comerciantes. Sin ella, las claves se guardan tal cual en la base de datos." }) }),
      /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
        /* @__PURE__ */ jsxs(Layout, { children: [
          /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Motor de IA" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Elige el proveedor que generará el contenido. Puedes usar la clave global del servidor o guardar una clave específica para esta tienda." }),
              /* @__PURE__ */ jsx(Divider, {}),
              /* @__PURE__ */ jsxs(FormLayout, { children: [
                /* @__PURE__ */ jsx(
                  Select,
                  {
                    label: "Proveedor",
                    name: "aiProvider",
                    options: PROVIDERS.map((provider) => ({
                      label: PROVIDER_LABELS[provider],
                      value: provider
                    })),
                    value: aiProvider,
                    onChange: setAiProvider,
                    helpText: aiProvider === "demo" ? "Modo demo: contenido de ejemplo, sin llamadas externas ni coste." : `También puedes definir ${envKeyAvailable[aiProvider] ?? "la API key"} en el servidor.`
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Modelo (opcional)",
                    name: "aiModel",
                    value: aiModel,
                    onChange: setAiModel,
                    autoComplete: "off",
                    placeholder: aiProvider === "openai" ? "gpt-4o-mini" : aiProvider === "anthropic" ? "claude-3-5-sonnet-latest" : aiProvider === "qwen" ? "qwen-plus" : aiProvider === "openrouter" ? "qwen/qwen-2.5-72b-instruct" : "demo-v1",
                    helpText: "Si lo dejas vacío se usa el modelo por defecto del proveedor."
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "API key de la tienda",
                    name: "apiKey",
                    type: "password",
                    value: apiKey,
                    onChange: setApiKey,
                    autoComplete: "off",
                    placeholder: settings.hasApiKey ? "•••••••• (guardada)" : "sk-…",
                    helpText: settings.hasApiKey ? "Ya hay una clave guardada. Escribe una nueva solo si quieres reemplazarla." : "Se guarda cifrada y nunca se muestra de nuevo."
                  }
                ),
                settings.hasApiKey && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx("input", { type: "hidden", name: "clearKey", value: "false" }),
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "¿Quieres eliminar la clave guardada?" }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "plain",
                      tone: "critical",
                      onClick: () => {
                        const form2 = new FormData();
                        form2.set("aiProvider", aiProvider);
                        form2.set("clearKey", "true");
                        form2.set("defaultTone", defaultTone);
                        form2.set("defaultLanguage", defaultLanguage);
                        form2.set("brandVoice", brandVoice);
                        form2.set("storeDescription", storeDescription);
                        form2.set("defaultKeywords", defaultKeywords);
                        fetcher.submit(form2, { method: "post" });
                      },
                      children: "Eliminar clave"
                    }
                  )
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Voz de marca" }),
              /* @__PURE__ */ jsxs(FormLayout, { children: [
                /* @__PURE__ */ jsxs(FormLayout.Group, { children: [
                  /* @__PURE__ */ jsx(
                    Select,
                    {
                      label: "Tono por defecto",
                      name: "defaultTone",
                      options: TONES.map((tone) => ({ label: tone, value: tone })),
                      value: defaultTone,
                      onChange: setDefaultTone
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Select,
                    {
                      label: "Idioma por defecto",
                      name: "defaultLanguage",
                      options: LANGUAGES.map((language) => ({
                        label: language.label,
                        value: language.code
                      })),
                      value: defaultLanguage,
                      onChange: setDefaultLanguage
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Palabras clave habituales",
                    name: "defaultKeywords",
                    value: defaultKeywords,
                    onChange: setDefaultKeywords,
                    autoComplete: "off",
                    helpText: "Separadas por comas. Se usarán como base si el producto no tiene etiquetas."
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Guía de voz de marca",
                    name: "brandVoice",
                    value: brandVoice,
                    onChange: setBrandVoice,
                    autoComplete: "off",
                    multiline: 3,
                    helpText: "Ej: cercana pero experta, tutea, evita superlativos, menciona sostenibilidad."
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Descripción de la tienda",
                    name: "storeDescription",
                    value: storeDescription,
                    onChange: setStoreDescription,
                    autoComplete: "off",
                    multiline: 2,
                    helpText: "Contexto que la IA usará para alinear el contenido con tu negocio."
                  }
                )
              ] })
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Tu uso" }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
                "Plan ",
                quota.planName
              ] }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                quota.remaining,
                " de ",
                quota.limit,
                " generaciones disponibles este mes."
              ] }),
              /* @__PURE__ */ jsx(Button, { url: "/app/billing", variant: "plain", children: "Cambiar de plan" })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Proveedores soportados" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· OpenAI (GPT-4o mini y superiores)" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Anthropic Claude 3.5 / 4" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Qwen (DashScope internacional)" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· OpenRouter (Qwen, Llama, Mistral…)" })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Coste estimado" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Una generación completa consume ~1.500 tokens de entrada y ~700 de salida. Con gpt-4o-mini el coste medio es inferior a 0,001 € por producto." })
            ] }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Box, { paddingBlockStart: "400", children: /* @__PURE__ */ jsx(InlineStack, { align: "end", children: /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading: saving, children: "Guardar ajustes" }) }) })
      ] })
    ] })
  ] });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: SettingsPage,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const BILLING_TEST_MODE = process.env.BILLING_TEST_MODE !== "false";
const BILLABLE_BILLING_NAMES = BILLABLE_PLAN_IDS.map(
  (planId) => PLANS[planId].billingName
);
async function syncBillingState(shop, billing) {
  var _a2;
  const settings = await getShopSettings(shop);
  let hasActivePayment = false;
  let subscription = null;
  try {
    const result = await billing.check({
      plans: BILLABLE_BILLING_NAMES,
      isTest: BILLING_TEST_MODE
    });
    hasActivePayment = result.hasActivePayment;
    subscription = ((_a2 = result.appSubscriptions) == null ? void 0 : _a2[0]) ?? null;
  } catch (error) {
    console.error(`No se pudo comprobar la suscripción de ${shop}`, error);
  }
  const matchedPlan = subscription ? getPlanByBillingName(subscription.name) : null;
  if (hasActivePayment && matchedPlan) {
    if (settings.plan !== matchedPlan.id || settings.subscriptionId !== (subscription == null ? void 0 : subscription.id)) {
      await setShopPlan(shop, matchedPlan.id, {
        subscriptionId: (subscription == null ? void 0 : subscription.id) ?? null,
        status: (subscription == null ? void 0 : subscription.status) ?? "ACTIVE"
      });
    }
    return {
      planId: matchedPlan.id,
      planName: matchedPlan.name,
      active: true,
      test: (subscription == null ? void 0 : subscription.test) ?? BILLING_TEST_MODE,
      subscription,
      hasActivePayment
    };
  }
  const fallbackPlan = getPlan(settings.plan);
  if (fallbackPlan.id !== "FREE" && !hasActivePayment) {
    await setShopPlan(shop, "FREE", { status: "NONE" });
  }
  return {
    planId: hasActivePayment && fallbackPlan.id !== "FREE" ? fallbackPlan.id : "FREE",
    planName: hasActivePayment ? fallbackPlan.name : PLANS.FREE.name,
    active: hasActivePayment,
    test: BILLING_TEST_MODE,
    subscription,
    hasActivePayment
  };
}
async function createSubscription(billing, planId, returnUrl) {
  if (planId === "FREE") return null;
  const plan = PLANS[planId];
  const result = await billing.request({
    plan: plan.billingName,
    isTest: BILLING_TEST_MODE,
    returnUrl
  });
  return result.confirmationUrl ?? null;
}
async function cancelSubscription(admin, subscriptionId) {
  var _a2, _b;
  if (!subscriptionId) return { ok: true };
  const response = await admin.graphql(
    `#graphql
      mutation cancelAppSubscription($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription { id status }
          userErrors { field message }
        }
      }`,
    { variables: { id: subscriptionId } }
  );
  const json = await response.json();
  const errors = ((_b = (_a2 = json.data) == null ? void 0 : _a2.appSubscriptionCancel) == null ? void 0 : _b.userErrors) ?? [];
  if (errors.length > 0) {
    return { ok: false, error: errors.map((error) => error.message).join(", ") };
  }
  return { ok: true };
}
const loader$4 = async ({ request }) => {
  var _a2;
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await getShopSettings(shop);
  const state = await syncBillingState(shop, billing);
  const quota = await getShopQuota(shop);
  return {
    currentPlan: state.planId,
    active: state.active,
    test: state.test,
    subscriptionStatus: ((_a2 = state.subscription) == null ? void 0 : _a2.status) ?? settings.subscriptionStatus ?? "NONE",
    testMode: BILLING_TEST_MODE,
    usage: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      percent: quota.percent,
      planName: quota.plan.name
    },
    plans: PLAN_IDS.map((id) => PLANS[id])
  };
};
const action$2 = async ({ request }) => {
  var _a2;
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "sync");
  try {
    if (intent === "subscribe") {
      const planId = String(formData.get("planId") ?? "");
      if (!PLAN_IDS.includes(planId) || planId === "FREE") {
        return { ok: false, error: "Plan no válido." };
      }
      const returnUrl = new URL("/app/billing", process.env.SHOPIFY_APP_URL ?? "https://localhost").toString();
      const confirmationUrl = await createSubscription(
        billing,
        planId,
        returnUrl
      );
      if (!confirmationUrl) {
        return { ok: false, error: "Shopify no devolvió una URL de confirmación." };
      }
      return { ok: true, intent: "subscribe", confirmationUrl };
    }
    if (intent === "cancel") {
      const settings = await getShopSettings(shop);
      const state = await syncBillingState(shop, billing);
      const subscriptionId = ((_a2 = state.subscription) == null ? void 0 : _a2.id) ?? settings.subscriptionId;
      const result = await cancelSubscription(admin, subscriptionId);
      if (!result.ok) return { ok: false, error: result.error ?? "No se pudo cancelar." };
      await setShopPlan(shop, "FREE", { status: "CANCELLED" });
      return { ok: true, intent: "cancel" };
    }
    await syncBillingState(shop, billing);
    return { ok: true, intent: "sync" };
  } catch (error) {
    console.error("Error de facturación", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error inesperado de facturación."
    };
  }
};
function BillingPage() {
  var _a2, _b;
  const { plans, currentPlan, active, test, testMode, usage, subscriptionStatus } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const data = fetcher.data;
  const error = data && !data.ok ? data : null;
  const subscribingPlan = fetcher.state !== "idle" && ((_a2 = fetcher.formData) == null ? void 0 : _a2.get("intent")) === "subscribe" ? String(fetcher.formData.get("planId") ?? "") : "";
  const cancelling = fetcher.state !== "idle" && ((_b = fetcher.formData) == null ? void 0 : _b.get("intent")) === "cancel";
  useEffect(() => {
    if ((data == null ? void 0 : data.ok) && data.intent === "subscribe") {
      window.open(data.confirmationUrl, "_top");
    }
  }, [data]);
  useEffect(() => {
    if ((data == null ? void 0 : data.ok) && data.intent === "cancel") {
      shopify2.toast.show("Suscripción cancelada. Sigues en el plan Free.");
    }
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [data, error, shopify2]);
  return /* @__PURE__ */ jsxs(Page, { title: "Plan y facturación", subtitle: "Suscripción gestionada de forma segura por Shopify", children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Plan y facturación" }),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      testMode && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Facturación en modo test", children: /* @__PURE__ */ jsx("p", { children: "Los cargos se simulan. Desactiva BILLING_TEST_MODE antes de enviar la app a revisión para que los comerciantes paguen de verdad." }) }),
      error && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "No se pudo completar la operación", children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
            /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
              /* @__PURE__ */ jsxs(Text, { as: "h2", variant: "headingMd", children: [
                "Plan actual: ",
                usage.planName
              ] }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                "Estado de la suscripción: ",
                subscriptionStatus,
                active ? " · Activa en Shopify" : " · Sin cargo activo"
              ] })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              test && /* @__PURE__ */ jsx(Badge, { tone: "attention", children: "Entorno test" }),
              /* @__PURE__ */ jsx(Badge, { tone: currentPlan === "FREE" ? void 0 : "success", children: currentPlan })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", children: "Generaciones este mes" }),
              /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: [
                usage.used,
                " / ",
                usage.limit
              ] })
            ] }),
            /* @__PURE__ */ jsx(ProgressBar, { progress: usage.percent, tone: usage.percent >= 90 ? "critical" : "primary" }),
            /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
              "Quedan ",
              usage.remaining,
              " generaciones en tu ciclo actual."
            ] })
          ] }),
          currentPlan !== "FREE" && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "cancel" }),
              /* @__PURE__ */ jsx(Button, { submit: true, tone: "critical", loading: cancelling, children: "Cancelar suscripción" })
            ] }),
            /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "sync" }),
              /* @__PURE__ */ jsx(Button, { submit: true, children: "Actualizar estado" })
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Cómo funciona el cobro" }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Shopify solicita tu aprobación y cobra en tu moneda de facturación. Puedes cancelar cuando quieras desde esta pantalla o desde tu admin de Shopify." }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Facturación en EUR · ciclo de 30 días · sin contratos." })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(InlineGrid, { columns: { xs: 1, sm: 2, md: 4 }, gap: "400", children: plans.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: plan.name }),
              plan.recommended && /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Recomendado" }),
              isCurrent && !plan.recommended && /* @__PURE__ */ jsx(Badge, { children: "Actual" })
            ] }),
            /* @__PURE__ */ jsxs(Text, { as: "p", variant: "headingLg", children: [
              plan.price === 0 ? "Gratis" : `${plan.price} €`,
              plan.price > 0 && /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                " ",
                "/mes"
              ] })
            ] }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: plan.tagline })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsx(List, { type: "bullet", children: plan.features.map((feature) => /* @__PURE__ */ jsx(List.Item, { children: feature }, feature)) }),
          /* @__PURE__ */ jsx(Box, { children: plan.id === "FREE" ? isCurrent || !active ? /* @__PURE__ */ jsx(Button, { fullWidth: true, disabled: isCurrent, url: "/app", children: isCurrent ? "Plan actual" : "Usar plan Free" }) : /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "cancel" }),
            /* @__PURE__ */ jsx(Button, { fullWidth: true, submit: true, loading: cancelling, children: "Cambiar al plan Free" })
          ] }) : /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "subscribe" }),
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "planId", value: plan.id }),
            /* @__PURE__ */ jsx(
              Button,
              {
                fullWidth: true,
                variant: plan.recommended ? "primary" : "secondary",
                submit: true,
                disabled: isCurrent,
                loading: subscribingPlan === plan.id,
                children: isCurrent ? "Plan actual" : `Elegir ${plan.name}`
              }
            )
          ] }) })
        ] }) }, plan.id);
      }) })
    ] })
  ] });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: BillingPage,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const PAGE_SIZE = 20;
const loader$3 = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page2 = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      skip: page2 * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.generation.count({ where: { shop: session.shop } })
  ]);
  return {
    page: page2,
    total,
    hasNextPage: (page2 + 1) * PAGE_SIZE < total,
    items: generations.map((item) => {
      const output = safeParseJson(item.outputJson, null);
      return {
        id: item.id,
        title: item.productTitle ?? "Sin título",
        type: item.type,
        provider: item.provider,
        model: item.model,
        createdAt: item.createdAt.toISOString(),
        applied: item.applied,
        tokensIn: item.tokensIn,
        tokensOut: item.tokensOut,
        productId: item.productId,
        metaTitle: (output == null ? void 0 : output.metaTitle) ?? "",
        metaDescription: (output == null ? void 0 : output.metaDescription) ?? "",
        descriptionPreview: stripHtml((output == null ? void 0 : output.descriptionHtml) ?? "").slice(0, 240),
        tags: (output == null ? void 0 : output.tags) ?? []
      };
    })
  };
};
function HistoryPage() {
  const { items, page: page2, total, hasNextPage } = useLoaderData();
  const [, setSearchParams] = useSearchParams();
  const goToPage = (nextPage) => {
    const params = new URLSearchParams();
    if (nextPage > 0) params.set("page", String(nextPage));
    setSearchParams(params);
  };
  return /* @__PURE__ */ jsxs(Page, { title: "Historial de generaciones", subtitle: `${total} generaciones registradas`, children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Historial" }),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
      items.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(
        EmptyState,
        {
          heading: "Todavía no hay generaciones",
          image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
          children: [
            /* @__PURE__ */ jsx("p", { children: "Cuando generes contenido con IA aparecerá aquí, con el resultado y su estado de publicación." }),
            /* @__PURE__ */ jsx(Button, { variant: "primary", url: "/app/products", children: "Optimizar un producto" })
          ]
        }
      ) }) : /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "0", children: items.map((item) => /* @__PURE__ */ jsx(
        Box,
        {
          paddingBlock: "400",
          borderBlockEndWidth: "025",
          borderColor: "border",
          children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: item.title }),
                /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                  new Date(item.createdAt).toLocaleString("es-ES"),
                  " ·",
                  " ",
                  item.provider,
                  " / ",
                  item.model,
                  " · ",
                  item.tokensIn + item.tokensOut,
                  " tokens"
                ] })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Badge, { tone: item.applied ? "success" : void 0, children: item.applied ? "Publicado" : "Borrador" }),
                item.productId && /* @__PURE__ */ jsx(
                  Button,
                  {
                    size: "slim",
                    url: `/app/products/${item.productId.split("/").pop()}`,
                    children: "Abrir producto"
                  }
                )
              ] })
            ] }),
            item.metaTitle && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
              /* @__PURE__ */ jsx("strong", { children: "Meta título:" }),
              " ",
              item.metaTitle
            ] }),
            item.metaDescription && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
              /* @__PURE__ */ jsx("strong", { children: "Meta descripción:" }),
              " ",
              item.metaDescription
            ] }),
            item.descriptionPreview && /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
              item.descriptionPreview,
              "…"
            ] }),
            item.tags.length > 0 && /* @__PURE__ */ jsx(InlineStack, { gap: "150", wrap: true, children: item.tags.slice(0, 8).map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, `${item.id}-${tag}`)) })
          ] })
        },
        item.id
      )) }) }),
      /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
        /* @__PURE__ */ jsx(Button, { disabled: page2 === 0, onClick: () => goToPage(page2 - 1), children: "Anterior" }),
        /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
          "Página ",
          page2 + 1
        ] }),
        /* @__PURE__ */ jsx(Button, { disabled: !hasNextPage, onClick: () => goToPage(page2 + 1), children: "Siguiente" })
      ] })
    ] })
  ] });
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: HistoryPage,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await getShopSettings(shop);
  const billingState = await syncBillingState(shop, billing);
  const quota = await getShopQuota(shop);
  let productCount = 0;
  try {
    productCount = await countProducts(admin);
  } catch (error) {
    console.error("No se pudo contar los productos", error);
  }
  const [recent, applied] = await Promise.all([
    prisma.generation.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.generation.count({ where: { shop, applied: true } })
  ]);
  return {
    shop,
    productCount,
    quota: {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      percent: quota.percent,
      planName: quota.plan.name
    },
    billing: {
      active: billingState.active,
      test: billingState.test,
      planId: billingState.planId
    },
    provider: settings.aiProvider,
    defaultLanguage: settings.defaultLanguage,
    applied,
    testMode: BILLING_TEST_MODE,
    recent: recent.map((item) => ({
      id: item.id,
      title: item.productTitle ?? "Sin título",
      createdAt: item.createdAt.toISOString(),
      provider: item.provider,
      applied: item.applied
    }))
  };
};
function Dashboard() {
  const {
    shop,
    productCount,
    quota,
    billing,
    provider,
    applied,
    testMode,
    recent
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "ShopGenius AI" }),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
      provider === "demo" && /* @__PURE__ */ jsx(
        Banner,
        {
          tone: "info",
          title: "Estás en modo demo",
          action: { content: "Conectar mi IA", url: "/app/settings" },
          children: /* @__PURE__ */ jsx("p", { children: "La app genera contenido de ejemplo sin consumir créditos. Añade tu API key de OpenAI, Claude o Qwen en Ajustes para producir contenido real con tu tono de marca." })
        }
      ),
      /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 2, md: 4 }, gap: "400", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Productos en la tienda" }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: productCount })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Generaciones este mes" }),
          /* @__PURE__ */ jsxs(Text, { as: "p", variant: "headingLg", children: [
            quota.used,
            " / ",
            quota.limit
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Contenido aplicado" }),
          /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: applied })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Plan actual" }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: billing.planId === "FREE" ? "Free" : quota.planName }),
            billing.test && /* @__PURE__ */ jsx(Badge, { tone: "attention", children: "Test" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Consumo del plan" }),
              /* @__PURE__ */ jsx(Button, { url: "/app/billing", variant: "plain", children: "Gestionar plan" })
            ] }),
            /* @__PURE__ */ jsx(ProgressBar, { progress: quota.percent, tone: quota.percent >= 90 ? "critical" : "primary" }),
            /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
              quota.remaining,
              " generaciones disponibles este mes. Se renuevan el día 1 de cada mes."
            ] }),
            quota.remaining === 0 && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: "Sin generaciones disponibles", children: /* @__PURE__ */ jsx("p", { children: "Mejora tu plan para seguir creando contenido con IA." }) })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Acciones rápidas" }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "300", wrap: true, children: [
              /* @__PURE__ */ jsx(Button, { variant: "primary", url: "/app/products", children: "Optimizar un producto" }),
              /* @__PURE__ */ jsx(Button, { url: "/app/bulk", children: "Generación masiva" }),
              /* @__PURE__ */ jsx(Button, { url: "/app/seo", children: "Auditar SEO" })
            ] }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
              "Tienda conectada: ",
              shop,
              testMode && " · Facturación en modo test de Shopify"
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Últimas generaciones" }),
              /* @__PURE__ */ jsx(Button, { url: "/app/history", variant: "plain", children: "Ver historial" })
            ] }),
            recent.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-surface-secondary", borderRadius: "200", children: /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Todavía no has generado contenido. Empieza con un producto y la IA creará descripción, SEO, etiquetas y alt text." }) }) : /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: recent.map((item) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
              /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "medium", children: item.title }),
                /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                  new Date(item.createdAt).toLocaleString("es-ES"),
                  " ·",
                  " ",
                  item.provider
                ] })
              ] }),
              /* @__PURE__ */ jsx(Badge, { tone: item.applied ? "success" : void 0, children: item.applied ? "Aplicado" : "Borrador" })
            ] }, item.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Cómo funciona" }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: "1. Elige un producto de tu catálogo." }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: "2. La IA lee título, variantes, etiquetas e imágenes." }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: "3. Genera descripción, SEO, tags y alt text." }),
            /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", children: "4. Revisas y aplicas a Shopify en un clic." })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Buenas prácticas" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Mantén descripciones de 300–900 caracteres." }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Meta título ≤ 60 caracteres y meta descripción ≤ 160." }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Usa 5–10 etiquetas por producto." }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "· Revisa siempre el contenido antes de publicarlo." })
            ] }),
            /* @__PURE__ */ jsx(Link, { to: "/app/settings", children: "Configurar voz de marca →" })
          ] }) })
        ] }) })
      ] })
    ] })
  ] });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const BATCH_LIMIT_BY_PLAN = {
  FREE: 3,
  STARTER: 5,
  PRO: 10,
  SCALE: 20
};
const loader$1 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  const quota = await getShopQuota(session.shop);
  const { products } = await listProducts(admin, { first: 50 });
  return {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      productType: product.productType,
      imageCount: product.images.length
    })),
    quota: {
      remaining: quota.remaining,
      limit: quota.limit,
      planName: quota.plan.name,
      planId: quota.planId
    },
    defaults: { tone: settings.defaultTone, language: settings.defaultLanguage },
    provider: settings.aiProvider,
    batchLimit: BATCH_LIMIT_BY_PLAN[quota.planId] ?? 3
  };
};
const action$1 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "generate");
  try {
    if (intent === "apply") {
      const ids2 = String(formData.get("generationIds") ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20);
      let applied = 0;
      const failed = [];
      for (const generationId of ids2) {
        const generation = await prisma.generation.findFirst({ where: { id: generationId, shop } });
        if (!generation) continue;
        const content = JSON.parse(generation.outputJson);
        const product = generation.productId ? await getProduct(admin, generation.productId) : null;
        if (!product) {
          failed.push({ title: generation.productTitle ?? "Producto", message: "Producto no encontrado" });
          continue;
        }
        const update = await updateProductContent(admin, {
          id: product.id,
          descriptionHtml: content.descriptionHtml,
          seoTitle: content.metaTitle,
          seoDescription: content.metaDescription,
          tags: content.tags
        });
        if (!update.ok) {
          failed.push({ title: product.title, message: update.errors.join(", ") });
          continue;
        }
        if (content.altTexts.length > 0) {
          const images = product.images.slice(0, content.altTexts.length).map((image, index) => ({ id: image.id, alt: content.altTexts[index] ?? "" })).filter((image) => image.id.startsWith("gid://"));
          if (images.length > 0) await updateImageAltTexts(admin, images);
        }
        await prisma.generation.update({
          where: { id: generation.id },
          data: { applied: true, appliedAt: /* @__PURE__ */ new Date() }
        });
        applied += 1;
      }
      return { ok: true, intent: "apply", applied, failed };
    }
    const ids = String(formData.get("productIds") ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return { ok: false, error: "Selecciona al menos un producto." };
    }
    const settings = await getShopSettings(shop);
    const quota = await assertQuota(shop);
    const maxByPlan = BATCH_LIMIT_BY_PLAN[quota.planId] ?? 3;
    const batchSize = Math.min(ids.length, maxByPlan, quota.remaining);
    const tone = String(formData.get("tone") ?? settings.defaultTone);
    const language = String(formData.get("language") ?? settings.defaultLanguage);
    const results = [];
    const errors = [];
    let remaining = quota.remaining;
    for (const id of ids.slice(0, batchSize)) {
      try {
        const product = await getProduct(admin, id);
        if (!product) {
          errors.push({ title: id, message: "Producto no encontrado" });
          continue;
        }
        const aiResult = await generateProductContent(
          {
            id: product.id,
            title: product.title,
            productType: product.productType,
            vendor: product.vendor,
            tags: product.tags,
            price: product.price,
            currentDescription: product.descriptionHtml,
            variants: product.variants.map((variant) => `${variant.title} (${variant.price})`),
            images: product.images
          },
          {
            tone,
            language,
            keywords: product.tags.slice(0, 3),
            brandVoice: settings.brandVoice ?? void 0,
            storeDescription: settings.storeDescription ?? void 0,
            imageCount: Math.min(product.images.length, 5)
          },
          buildAiConfig(settings)
        );
        const generation = await recordGeneration({
          shop,
          type: "PRODUCT_DESCRIPTION",
          productId: product.id,
          productTitle: product.title,
          provider: aiResult.provider,
          model: aiResult.model,
          input: { productId: product.id, tone, language },
          output: aiResult.content,
          tokensIn: aiResult.tokensIn,
          tokensOut: aiResult.tokensOut,
          shopSettingsId: settings.id
        });
        results.push({
          productId: product.id,
          title: product.title,
          generationId: generation.id,
          score: scoreSeoContent(aiResult.content).score,
          tagCount: aiResult.content.tags.length,
          altCount: aiResult.content.altTexts.length,
          demo: aiResult.demo
        });
        remaining = Math.max(0, remaining - 1);
      } catch (error) {
        errors.push({
          title: id,
          message: error instanceof Error ? error.message : "Error desconocido"
        });
      }
    }
    return { ok: true, intent: "generate", results, errors, remaining };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    }
    if (error instanceof AiError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("Error en generación masiva", error);
    return { ok: false, error: "No se pudo completar la generación masiva." };
  }
};
function BulkPage() {
  var _a2, _b, _c, _d;
  const { products, quota, defaults, provider, batchLimit } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const [selected, setSelected] = useState([]);
  const [tone, setTone] = useState(defaults.tone);
  const [language, setLanguage] = useState(defaults.language);
  const generating = fetcher.state !== "idle" && ((_a2 = fetcher.formData) == null ? void 0 : _a2.get("intent")) === "generate";
  const applyingState = fetcher.state !== "idle" && ((_b = fetcher.formData) == null ? void 0 : _b.get("intent")) === "apply";
  const generated = ((_c = fetcher.data) == null ? void 0 : _c.ok) && fetcher.data.intent === "generate" ? fetcher.data : null;
  const appliedData = ((_d = fetcher.data) == null ? void 0 : _d.ok) && fetcher.data.intent === "apply" ? fetcher.data : null;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;
  useEffect(() => {
    if (generated) shopify2.toast.show(`${generated.results.length} productos generados`);
  }, [generated, shopify2]);
  useEffect(() => {
    if (appliedData) shopify2.toast.show(`${appliedData.applied} productos publicados`);
  }, [appliedData, shopify2]);
  useEffect(() => {
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [error, shopify2]);
  const toggle = (id, checked) => {
    setSelected((current) => {
      if (checked) {
        if (current.length >= batchLimit) {
          shopify2.toast.show(`Máximo ${batchLimit} productos por lote en tu plan`, { isError: true });
          return current;
        }
        return [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Generación masiva",
      subtitle: `Optimiza varios productos a la vez · Lote máximo: ${batchLimit}`,
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Generación masiva" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          (error == null ? void 0 : error.code) === "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Sin generaciones disponibles", action: { content: "Ver planes", url: "/app/billing" }, children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          error && error.code !== "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Error", children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          /* @__PURE__ */ jsx(Banner, { tone: "info", title: "Cómo funciona la generación masiva", children: /* @__PURE__ */ jsxs("p", { children: [
            "Selecciona hasta ",
            batchLimit,
            " productos. La IA generará descripciones, SEO, etiquetas y alt text para cada uno. Revisa los resultados y publícalos todos con un clic. Cada producto consume 1 generación."
          ] }) }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsxs(Layout.Section, { children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsxs(Text, { as: "h2", variant: "headingMd", children: [
                    "Productos (",
                    selected.length,
                    " seleccionados)"
                  ] }),
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Tono",
                        labelInline: true,
                        options: TONES.map((value) => ({ label: value, value })),
                        value: tone,
                        onChange: setTone
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Select,
                      {
                        label: "Idioma",
                        labelInline: true,
                        options: LANGUAGES.map((item) => ({ label: item.label, value: item.code })),
                        value: language,
                        onChange: setLanguage
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx(Divider, {}),
                /* @__PURE__ */ jsx("div", { style: { maxHeight: 520, overflowY: "scroll" }, children: /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: products.map((product) => /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    label: `${product.title}${product.productType ? ` · ${product.productType}` : ""}`,
                    checked: selected.includes(product.id),
                    onChange: (checked) => toggle(product.id, checked)
                  },
                  product.id
                )) }) }),
                /* @__PURE__ */ jsx(Divider, {}),
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    quota.remaining,
                    " generaciones disponibles · Plan ",
                    quota.planName,
                    " ·",
                    " ",
                    "Proveedor: ",
                    provider
                  ] }),
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "generate" }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "productIds", value: selected.join(",") }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "tone", value: tone }),
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "language", value: language }),
                    /* @__PURE__ */ jsxs(
                      Button,
                      {
                        variant: "primary",
                        submit: true,
                        loading: generating,
                        disabled: selected.length === 0 || quota.remaining === 0,
                        children: [
                          "Generar ",
                          selected.length > 0 ? `${selected.length} productos` : ""
                        ]
                      }
                    )
                  ] })
                ] })
              ] }) }),
              generated && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsxs(Text, { as: "h2", variant: "headingMd", children: [
                    "Resultados (",
                    generated.results.length,
                    ")"
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    "Quedan ",
                    generated.remaining,
                    " generaciones"
                  ] })
                ] }),
                /* @__PURE__ */ jsx(Divider, {}),
                generated.results.map((result) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, children: [
                  /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                    /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "medium", children: result.title }),
                    /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                      result.tagCount,
                      " etiquetas · ",
                      result.altCount,
                      " alt text",
                      result.demo ? " · demo" : ""
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(Badge, { tone: result.score >= 80 ? "success" : result.score >= 50 ? "attention" : "critical", children: `SEO ${result.score}` })
                ] }, result.generationId)),
                generated.errors.length > 0 && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: `${generated.errors.length} productos con error`, children: /* @__PURE__ */ jsx(BlockStack, { gap: "100", children: generated.errors.map((item) => /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
                  item.title,
                  ": ",
                  item.message
                ] }, `${item.title}-${item.message}`)) }) }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "apply" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "hidden",
                        name: "generationIds",
                        value: generated.results.map((result) => result.generationId).join(",")
                      }
                    ),
                    /* @__PURE__ */ jsx(Button, { variant: "primary", submit: true, loading: applyingState, children: `Publicar los ${generated.results.length} en Shopify` })
                  ] }),
                  /* @__PURE__ */ jsx(Button, { url: "/app/history", children: "Ver historial" })
                ] }),
                appliedData && appliedData.failed.length > 0 && /* @__PURE__ */ jsx(Banner, { tone: "warning", title: `${appliedData.failed.length} fallos al publicar`, children: /* @__PURE__ */ jsx(BlockStack, { gap: "100", children: appliedData.failed.map((item) => /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", children: [
                  item.title,
                  ": ",
                  item.message
                ] }, item.title)) }) })
              ] }) })
            ] }),
            /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Tu plan" }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodyMd", children: [
                quota.planName,
                " · ",
                quota.limit,
                " generaciones/mes"
              ] }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "bodySm", tone: "subdued", children: [
                "Quedan ",
                quota.remaining,
                ". Los lotes grandes están disponibles en planes superiores."
              ] }),
              /* @__PURE__ */ jsx(Button, { url: "/app/billing", children: "Mejorar plan" })
            ] }) }) })
          ] })
        ] })
      ]
    }
  );
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: BulkPage,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { products } = await listProducts(admin, { first: 50 });
  const quota = await getShopQuota(session.shop);
  const audits = products.map(
    (product) => auditProduct({
      id: product.id,
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      tags: product.tags,
      productType: product.productType,
      images: product.images,
      variants: product.variants
    })
  );
  const summary = summarizeAudit(audits);
  const issueCounts = /* @__PURE__ */ new Map();
  audits.forEach((audit) => {
    audit.issues.forEach((issue) => {
      const current = issueCounts.get(issue.code);
      issueCounts.set(issue.code, {
        message: issue.message,
        severity: issue.severity,
        count: ((current == null ? void 0 : current.count) ?? 0) + 1
      });
    });
  });
  return {
    summary,
    quota: { remaining: quota.remaining, limit: quota.limit, planName: quota.plan.name },
    audits: audits.filter((audit) => audit.issues.length > 0).sort((a, b) => a.score - b.score).slice(0, 25).map((audit) => {
      var _a2;
      const product = products.find((item) => item.id === audit.productId);
      return {
        ...audit,
        productType: (product == null ? void 0 : product.productType) ?? null,
        topIssue: ((_a2 = audit.issues[0]) == null ? void 0 : _a2.message) ?? ""
      };
    }),
    issues: Array.from(issueCounts.entries()).map(([code, value]) => ({ code, ...value })).sort((a, b) => b.count - a.count)
  };
};
const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");
  try {
    const quota = await assertQuota(shop);
    const product = await getProduct(admin, productId);
    if (!product) return { ok: false, error: "Producto no encontrado." };
    const settings = await getShopSettings(shop);
    const aiResult = await generateProductContent(
      {
        id: product.id,
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        tags: product.tags,
        price: product.price,
        currentDescription: product.descriptionHtml,
        variants: product.variants.map((variant) => `${variant.title} (${variant.price})`),
        images: product.images
      },
      {
        tone: settings.defaultTone,
        language: settings.defaultLanguage,
        keywords: settings.defaultKeywords ? settings.defaultKeywords.split(",").map((keyword) => keyword.trim()) : product.tags.slice(0, 3),
        brandVoice: settings.brandVoice ?? void 0,
        storeDescription: settings.storeDescription ?? void 0,
        imageCount: Math.min(product.images.length, 5)
      },
      buildAiConfig(settings)
    );
    const update = await updateProductContent(admin, {
      id: product.id,
      descriptionHtml: aiResult.content.descriptionHtml,
      seoTitle: aiResult.content.metaTitle,
      seoDescription: aiResult.content.metaDescription,
      tags: aiResult.content.tags
    });
    if (!update.ok) {
      return { ok: false, error: update.errors.join(", ") };
    }
    const warnings = [];
    if (aiResult.content.altTexts.length > 0) {
      const images = product.images.slice(0, aiResult.content.altTexts.length).map((image, index) => ({ id: image.id, alt: aiResult.content.altTexts[index] ?? "" })).filter((image) => image.id.startsWith("gid://"));
      if (images.length > 0) {
        const alt = await updateImageAltTexts(admin, images);
        if (!alt.ok) warnings.push(alt.errors.join(", "));
      }
    }
    const generation = await recordGeneration({
      shop,
      type: "PRODUCT_DESCRIPTION",
      productId: product.id,
      productTitle: product.title,
      provider: aiResult.provider,
      model: aiResult.model,
      input: { productId: product.id, source: "seo-audit" },
      output: aiResult.content,
      tokensIn: aiResult.tokensIn,
      tokensOut: aiResult.tokensOut,
      shopSettingsId: settings.id,
      applied: true
    });
    await prisma.generation.update({
      where: { id: generation.id },
      data: { applied: true, appliedAt: /* @__PURE__ */ new Date() }
    });
    return {
      ok: true,
      productId: product.id,
      title: product.title,
      score: 100,
      remaining: Math.max(0, quota.remaining - 1),
      warnings
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) return { ok: false, error: error.message, code: "QUOTA_EXCEEDED" };
    if (error instanceof AiError) return { ok: false, error: error.message, code: error.code };
    console.error("Error corrigiendo producto", error);
    return { ok: false, error: "No se pudo corregir el producto." };
  }
};
function SeoAuditPage() {
  var _a2;
  const { summary, audits, issues, quota } = useLoaderData();
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const fixing = fetcher.state !== "idle" ? String(((_a2 = fetcher.formData) == null ? void 0 : _a2.get("productId")) ?? "") : "";
  const result = fetcher.data;
  const error = result && !result.ok ? result : null;
  const success = result && result.ok ? result : null;
  useEffect(() => {
    if (success) shopify2.toast.show(`"${success.title}" optimizado`);
  }, [success, shopify2]);
  useEffect(() => {
    if (error) shopify2.toast.show(error.error, { isError: true });
  }, [error, shopify2]);
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "Auditoría SEO",
      subtitle: "Detecta productos con contenido incompleto y corrígelos con IA",
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Auditoría SEO" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          success && /* @__PURE__ */ jsxs(Banner, { tone: "success", title: `${success.title} optimizado`, onDismiss: () => void 0, children: [
            /* @__PURE__ */ jsxs("p", { children: [
              "Descripción, metadatos, etiquetas y alt text actualizados. Quedan",
              " ",
              success.remaining,
              " generaciones."
            ] }),
            success.warnings.length > 0 && /* @__PURE__ */ jsx("p", { children: success.warnings.join(" · ") })
          ] }),
          (error == null ? void 0 : error.code) === "QUOTA_EXCEEDED" && /* @__PURE__ */ jsx(Banner, { tone: "critical", title: "Sin generaciones disponibles", action: { content: "Ver planes", url: "/app/billing" }, children: /* @__PURE__ */ jsx("p", { children: error.error }) }),
          /* @__PURE__ */ jsxs(InlineGrid, { columns: { xs: 1, sm: 2, md: 4 }, gap: "400", children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Salud SEO media" }),
              /* @__PURE__ */ jsxs(Text, { as: "p", variant: "headingLg", children: [
                summary.averageScore,
                "/100"
              ] }),
              /* @__PURE__ */ jsx(ProgressBar, { progress: summary.averageScore })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Productos analizados" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: summary.totalProducts })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Incidencias críticas" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: summary.critical })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", tone: "subdued", children: "Generaciones disponibles" }),
              /* @__PURE__ */ jsx(Text, { as: "p", variant: "headingLg", children: quota.remaining }),
              /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                "Plan ",
                quota.planName
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Layout, { children: [
            /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Productos que necesitan atención" }),
              /* @__PURE__ */ jsx(Divider, {}),
              audits.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: "400", children: /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "No se han detectado problemas en los primeros 50 productos. ¡Buen trabajo!" }) }) : /* @__PURE__ */ jsx(BlockStack, { gap: "0", children: audits.map((audit) => /* @__PURE__ */ jsx(Box, { paddingBlock: "300", borderBlockEndWidth: "025", borderColor: "border", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", wrap: true, gap: "300", children: [
                /* @__PURE__ */ jsxs(BlockStack, { gap: "050", children: [
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: audit.title }),
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    audit.topIssue,
                    " · ",
                    audit.productType ?? "Sin tipo"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Badge, { tone: audit.score >= 80 ? "success" : audit.score >= 50 ? "attention" : "critical", children: `SEO ${audit.score}` }),
                  /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
                    audit.issues.length,
                    " avisos"
                  ] }),
                  /* @__PURE__ */ jsxs(fetcher.Form, { method: "post", children: [
                    /* @__PURE__ */ jsx("input", { type: "hidden", name: "productId", value: audit.productId }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        submit: true,
                        variant: "primary",
                        size: "slim",
                        loading: fixing === audit.productId,
                        disabled: quota.remaining <= 0,
                        children: "Corregir con IA"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "slim",
                      url: `/app/products/${audit.productId.split("/").pop()}`,
                      children: "Revisar"
                    }
                  )
                ] })
              ] }) }, audit.productId)) })
            ] }) }) }),
            /* @__PURE__ */ jsxs(Layout.Section, { variant: "oneThird", children: [
              /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Incidencias más frecuentes" }),
                /* @__PURE__ */ jsx(Divider, {}),
                issues.length === 0 ? /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", tone: "subdued", children: "Sin incidencias registradas." }) : issues.slice(0, 8).map((issue) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", children: issue.message }),
                  /* @__PURE__ */ jsx(
                    Badge,
                    {
                      tone: issue.severity === "critical" ? "critical" : issue.severity === "warning" ? "warning" : void 0,
                      children: String(issue.count)
                    }
                  )
                ] }, issue.code))
              ] }) }),
              /* @__PURE__ */ jsx(Box, { paddingBlockStart: "400", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingMd", children: "Cómo puntuamos" }),
                /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodySm", children: "Descripción 25 pts · meta título 20 · meta descripción 20 · etiquetas 15 · keywords 10 · bullets 10. Los avisos críticos restan 22 puntos y los warnings 10." })
              ] }) }) })
            ] })
          ] })
        ] })
      ]
    }
  );
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: SeoAuditPage,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-nD8Zvac8.js", "imports": ["/assets/components-2vndjt8N.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-uqjESOUI.js", "imports": ["/assets/components-2vndjt8N.js"], "css": [] }, "routes/webhooks.app_subscriptions.update": { "id": "routes/webhooks.app_subscriptions.update", "parentId": "root", "path": "webhooks/app_subscriptions/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app_subscriptions.update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.customers.data_request": { "id": "routes/webhooks.customers.data_request", "parentId": "root", "path": "webhooks/customers/data_request", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.customers.data_request-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.customers.redact": { "id": "routes/webhooks.customers.redact", "parentId": "root", "path": "webhooks/customers/redact", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.customers.redact-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.shop.redact": { "id": "routes/webhooks.shop.redact", "parentId": "root", "path": "webhooks/shop/redact", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.shop.redact-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-B47TvOoE.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/styles-7sMpJqkq.js", "/assets/Page-D3Hwf4b3.js", "/assets/FormLayout-DrdPIy5I.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/healthz": { "id": "routes/healthz", "parentId": "root", "path": "healthz", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/healthz-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-Dfru7wPW.js", "imports": ["/assets/components-2vndjt8N.js"], "css": ["/assets/route-vqY7YYHB.css"] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-DJePcbLp.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/styles-7sMpJqkq.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.recommendations": { "id": "routes/app.recommendations", "parentId": "routes/app", "path": "recommendations", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.recommendations-CkJ3XJiq.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/ai-core-mDOM-vk8.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/FormLayout-DrdPIy5I.js", "/assets/Divider-DXbX5Oqs.js", "/assets/ProgressBar-DdOY-U6k.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.products": { "id": "routes/app.products", "parentId": "routes/app", "path": "products", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.products-Chx0nyUc.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Divider-DXbX5Oqs.js", "/assets/EmptyState-BVsCXTjX.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.products.$id": { "id": "routes/app.products.$id", "parentId": "routes/app.products", "path": ":id", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.products._id-YqIq4sIy.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/ai-core-mDOM-vk8.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/FormLayout-DrdPIy5I.js", "/assets/ProgressBar-DdOY-U6k.js", "/assets/Divider-DXbX5Oqs.js", "/assets/List-D5S8A6sy.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-23i0v052.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/ai-core-mDOM-vk8.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/Divider-DXbX5Oqs.js", "/assets/FormLayout-DrdPIy5I.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.billing": { "id": "routes/app.billing", "parentId": "routes/app", "path": "billing", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.billing-BZfWJv0o.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/Divider-DXbX5Oqs.js", "/assets/ProgressBar-DdOY-U6k.js", "/assets/InlineGrid-BHPXeEQD.js", "/assets/List-D5S8A6sy.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.history": { "id": "routes/app.history", "parentId": "routes/app", "path": "history", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.history-BS5qBKC7.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/EmptyState-BVsCXTjX.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-oQ9vDDuz.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/InlineGrid-BHPXeEQD.js", "/assets/ProgressBar-DdOY-U6k.js", "/assets/Divider-DXbX5Oqs.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.bulk": { "id": "routes/app.bulk", "parentId": "routes/app", "path": "bulk", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.bulk-NaUuevme.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/ai-core-mDOM-vk8.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/Divider-DXbX5Oqs.js", "/assets/context-uSBNpNqa.js"], "css": [] }, "routes/app.seo": { "id": "routes/app.seo", "parentId": "routes/app", "path": "seo", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.seo-DxiGpMZF.js", "imports": ["/assets/components-2vndjt8N.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-D3Hwf4b3.js", "/assets/TitleBar-DFMSJ8Yc.js", "/assets/Layout-C49HfCTj.js", "/assets/InlineGrid-BHPXeEQD.js", "/assets/ProgressBar-DdOY-U6k.js", "/assets/Divider-DXbX5Oqs.js", "/assets/context-uSBNpNqa.js"], "css": [] } }, "url": "/assets/manifest-2287942b.js", "version": "2287942b" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app_subscriptions.update": {
    id: "routes/webhooks.app_subscriptions.update",
    parentId: "root",
    path: "webhooks/app_subscriptions/update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.customers.data_request": {
    id: "routes/webhooks.customers.data_request",
    parentId: "root",
    path: "webhooks/customers/data_request",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/webhooks.customers.redact": {
    id: "routes/webhooks.customers.redact",
    parentId: "root",
    path: "webhooks/customers/redact",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/webhooks.shop.redact": {
    id: "routes/webhooks.shop.redact",
    parentId: "root",
    path: "webhooks/shop/redact",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/healthz": {
    id: "routes/healthz",
    parentId: "root",
    path: "healthz",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route9
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.recommendations": {
    id: "routes/app.recommendations",
    parentId: "routes/app",
    path: "recommendations",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.products": {
    id: "routes/app.products",
    parentId: "routes/app",
    path: "products",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app.products.$id": {
    id: "routes/app.products.$id",
    parentId: "routes/app.products",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.billing": {
    id: "routes/app.billing",
    parentId: "routes/app",
    path: "billing",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.history": {
    id: "routes/app.history",
    parentId: "routes/app",
    path: "history",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.bulk": {
    id: "routes/app.bulk",
    parentId: "routes/app",
    path: "bulk",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app.seo": {
    id: "routes/app.seo",
    parentId: "routes/app",
    path: "seo",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
