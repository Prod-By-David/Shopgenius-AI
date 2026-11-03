/**
 * Utilidades SEO puras: auditoría de productos y puntuación de contenido.
 * Sin dependencias de servidor para poder testearlas de forma aislada.
 */

export type IssueSeverity = "critical" | "warning" | "opportunity";

export interface SeoIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  hint: string;
}

export interface AuditableProduct {
  id: string;
  title: string;
  descriptionHtml?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  productType?: string | null;
  images?: Array<{ id?: string; url?: string; altText?: string | null }>;
  variants?: Array<{ price?: string | null }>;
}

export interface ProductAudit {
  productId: string;
  title: string;
  score: number;
  issues: SeoIssue[];
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Sanea el HTML generado por la IA dejando solo etiquetas seguras. */
const ALLOWED_TAGS = new Set([
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
  "blockquote",
]);

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const withoutDangerous = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  return withoutDangerous.replace(
    /<\/?([a-zA-Z0-9]+)([^>]*)>/g,
    (match, tag: string, _attrs: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      return name === "br" ? "<br />" : match.startsWith("</") ? `</${name}>` : `<${name}>`;
    },
  );
}

export interface ScoreInput {
  descriptionHtml?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string[];
  keywords?: string[];
  bulletPoints?: string[];
}

export interface ScoreResult {
  score: number;
  breakdown: Array<{ label: string; points: number; max: number; ok: boolean }>;
}

export function scoreSeoContent(input: ScoreInput): ScoreResult {
  const description = stripHtml(input.descriptionHtml);
  const metaTitle = (input.metaTitle ?? "").trim();
  const metaDescription = (input.metaDescription ?? "").trim();
  const tags = input.tags ?? [];
  const keywords = (input.keywords ?? []).filter(Boolean);
  const bullets = input.bulletPoints ?? [];

  const checks: Array<{ label: string; points: number; max: number }> = [];

  const descriptionPoints =
    description.length >= 600 ? 25 : description.length >= 300 ? 18 : description.length >= 120 ? 10 : 0;
  checks.push({ label: "Descripción completa (300+ caracteres)", points: descriptionPoints, max: 25 });

  const titlePoints =
    metaTitle.length >= 30 && metaTitle.length <= 60
      ? 20
      : metaTitle.length > 0 && metaTitle.length <= 70
        ? 12
        : 0;
  checks.push({ label: "Meta título de 30–60 caracteres", points: titlePoints, max: 20 });

  const metaPoints =
    metaDescription.length >= 120 && metaDescription.length <= 160
      ? 20
      : metaDescription.length >= 70
        ? 12
        : 0;
  checks.push({ label: "Meta descripción de 120–160 caracteres", points: metaPoints, max: 20 });

  const tagPoints = tags.length >= 5 ? 15 : tags.length >= 3 ? 10 : tags.length > 0 ? 5 : 0;
  checks.push({ label: "Etiquetas relevantes (3+)", points: tagPoints, max: 15 });

  const keywordPoints =
    keywords.length === 0
      ? 5
      : keywords.filter((keyword) =>
          `${description} ${metaTitle} ${metaDescription}`.toLowerCase().includes(keyword.toLowerCase()),
        ).length >= Math.min(2, keywords.length)
        ? 10
        : 4;
  checks.push({ label: "Palabras clave integradas", points: keywordPoints, max: 10 });

  const bulletPoints = bullets.length >= 3 ? 10 : bullets.length > 0 ? 5 : 0;
  checks.push({ label: "Bullets de venta (3+)", points: bulletPoints, max: 10 });

  const score = checks.reduce((total, check) => total + check.points, 0);

  return {
    score,
    breakdown: checks.map((check) => ({ ...check, ok: check.points === check.max })),
  };
}

export function auditProduct(product: AuditableProduct): ProductAudit {
  const issues: SeoIssue[] = [];
  const description = stripHtml(product.descriptionHtml);
  const images = product.images ?? [];
  const tags = product.tags ?? [];

  if (description.length === 0) {
    issues.push({
      code: "missing_description",
      severity: "critical",
      message: "El producto no tiene descripción.",
      hint: "Genera una descripción con IA y publícala en un clic.",
    });
  } else if (description.length < 300) {
    issues.push({
      code: "short_description",
      severity: "warning",
      message: `Descripción muy corta (${description.length} caracteres).`,
      hint: "Amplía a 300–900 caracteres con beneficios y detalles de uso.",
    });
  }

  if (!product.seoTitle) {
    issues.push({
      code: "missing_seo_title",
      severity: "critical",
      message: "Falta el meta título SEO.",
      hint: "Añade un título de 30–60 caracteres con la keyword principal.",
    });
  } else if (product.seoTitle.length > 60) {
    issues.push({
      code: "long_seo_title",
      severity: "warning",
      message: `El meta título tiene ${product.seoTitle.length} caracteres (máx. 60).`,
      hint: "Acórtalo para que no se trunque en Google.",
    });
  }

  if (!product.seoDescription) {
    issues.push({
      code: "missing_seo_description",
      severity: "critical",
      message: "Falta la meta descripción.",
      hint: "Genera una de 120–160 caracteres con llamada a la acción.",
    });
  } else if (product.seoDescription.length > 160) {
    issues.push({
      code: "long_seo_description",
      severity: "warning",
      message: `La meta descripción tiene ${product.seoDescription.length} caracteres (máx. 160).`,
      hint: "Resume el beneficio principal en menos de 160 caracteres.",
    });
  }

  const imagesWithoutAlt = images.filter((image) => !image.altText || !image.altText.trim());
  if (images.length > 0 && imagesWithoutAlt.length > 0) {
    issues.push({
      code: "missing_alt_text",
      severity: imagesWithoutAlt.length === images.length ? "warning" : "opportunity",
      message: `${imagesWithoutAlt.length} de ${images.length} imágenes sin texto alternativo.`,
      hint: "El alt text mejora accesibilidad y posiciona en Google Imágenes.",
    });
  }

  if (tags.length < 3) {
    issues.push({
      code: "few_tags",
      severity: "opportunity",
      message: `Solo ${tags.length} etiquetas.`,
      hint: "Añade 5–10 etiquetas de producto para colecciones automáticas.",
    });
  }

  if (!product.productType) {
    issues.push({
      code: "missing_product_type",
      severity: "opportunity",
      message: "Sin tipo de producto.",
      hint: "El tipo de producto alimenta filtros y recomendaciones.",
    });
  }

  if (product.title.trim().length < 15) {
    issues.push({
      code: "short_title",
      severity: "opportunity",
      message: "Título muy corto para SEO.",
      hint: "Incluye atributo + categoría (ej. «Mochila impermeable 25L»).",
    });
  }

  const score = Math.max(
    0,
    100 -
      issues.reduce((penalty, issue) => {
        if (issue.severity === "critical") return penalty + 22;
        if (issue.severity === "warning") return penalty + 10;
        return penalty + 4;
      }, 0),
  );

  return { productId: product.id, title: product.title, score, issues };
}

export function summarizeAudit(audits: ProductAudit[]) {
  const totalIssues = audits.reduce((total, audit) => total + audit.issues.length, 0);
  const averageScore =
    audits.length > 0
      ? Math.round(audits.reduce((total, audit) => total + audit.score, 0) / audits.length)
      : 0;
  return {
    totalProducts: audits.length,
    totalIssues,
    averageScore,
    critical: audits.reduce(
      (total, audit) => total + audit.issues.filter((issue) => issue.severity === "critical").length,
      0,
    ),
    productsWithIssues: audits.filter((audit) => audit.issues.length > 0).length,
  };
}
