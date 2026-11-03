import { describe, expect, it } from "vitest";

import {
  auditProduct,
  sanitizeHtml,
  scoreSeoContent,
  stripHtml,
  summarizeAudit,
  truncate,
} from "../app/services/seo";

describe("stripHtml / truncate / sanitizeHtml", () => {
  it("extrae texto plano", () => {
    expect(stripHtml("<p>Hola <strong>mundo</strong></p>")).toBe("Hola mundo");
    expect(stripHtml(null)).toBe("");
  });

  it("trunca sin cortar palabras", () => {
    const result = truncate("una frase bastante larga para recortar", 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("…")).toBe(true);
  });

  it("elimina scripts, estilos y atributos peligrosos", () => {
    const dirty = '<p onclick="alert(1)">Hola</p><script>alert(1)</script><iframe src="x"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("iframe");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("<p>Hola</p>");
  });
});

describe("scoreSeoContent", () => {
  it("puntúa mejor un contenido completo", () => {
    const strong = scoreSeoContent({
      descriptionHtml: `<p>${"Descripción detallada con beneficios. ".repeat(20)}</p>`,
      metaTitle: "Mochila impermeable 25L | TrekCo",
      metaDescription:
        "Mochila impermeable de 25 litros con espalda acolchada y garantía de 2 años. Envío rápido, devoluciones fáciles y pago seguro en nuestra tienda online.",
      tags: ["mochila", "outdoor", "impermeable", "25l", "senderismo"],
      keywords: ["mochila impermeable", "25 litros"],
      bulletPoints: ["Impermeable", "Ligera", "Garantía 2 años"],
    });
    const weak = scoreSeoContent({ descriptionHtml: "<p>Corta</p>" });

    expect(strong.score).toBe(100);
    expect(weak.score).toBeLessThan(50);
    expect(strong.breakdown).toHaveLength(6);
  });
});

describe("auditProduct", () => {
  it("detecta problemas críticos en un producto vacío", () => {
    const audit = auditProduct({
      id: "1",
      title: "Producto",
      descriptionHtml: "",
      tags: [],
    });
    const codes = audit.issues.map((issue) => issue.code);

    expect(codes).toContain("missing_description");
    expect(codes).toContain("missing_seo_title");
    expect(codes).toContain("missing_seo_description");
    expect(audit.score).toBeLessThan(50);
  });

  it("puntúa alto un producto optimizado", () => {
    const audit = auditProduct({
      id: "2",
      title: "Mochila impermeable 25L TrekCo",
      descriptionHtml: `<p>${"Texto optimizado con detalles. ".repeat(30)}</p>`,
      seoTitle: "Mochila impermeable 25L | TrekCo",
      seoDescription: "Mochila impermeable de 25L para tus rutas. Envío rápido y garantía de 2 años.",
      tags: ["mochila", "outdoor", "impermeable", "25l"],
      productType: "Mochila",
      images: [{ id: "a", url: "x", altText: "Mochila negra de 25 litros" }],
    });

    expect(audit.score).toBe(100);
    expect(audit.issues.filter((issue) => issue.severity === "critical")).toHaveLength(0);
  });

  it("resume una lista de auditorías", () => {
    const summary = summarizeAudit([
      auditProduct({ id: "1", title: "A", descriptionHtml: "", tags: [] }),
      auditProduct({
        id: "2",
        title: "B",
        descriptionHtml: "<p>ok</p>",
        seoTitle: "B",
        seoDescription: "B",
        tags: ["a", "b", "c"],
        productType: "X",
        images: [],
      }),
    ]);
    expect(summary.totalProducts).toBe(2);
    expect(summary.productsWithIssues).toBe(2);
    expect(summary.critical).toBeGreaterThan(0);
    expect(summary.averageScore).toBeLessThan(100);
  });
});
