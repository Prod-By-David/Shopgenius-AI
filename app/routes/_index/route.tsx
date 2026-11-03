import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>ShopGenius<span>AI</span></span>
        <span className={styles.pill}>Disponible en la Shopify App Store</span>
      </header>

      <section className={styles.hero}>
        <h1>Tu catálogo, optimizado por IA en minutos.</h1>
        <p className={styles.tagline}>
          Descripciones que venden, metadatos SEO perfectos, alt text para cada
          imagen y recomendaciones cruzadas. Todo dentro de tu panel de Shopify,
          desde 49 €/mes.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Dominio de tu tienda</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="mi-tienda.myshopify.com"
              />
              <span className={styles.hint}>ej. mi-tienda.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Instalar en mi tienda
            </button>
          </Form>
        )}

        <ul className={styles.grid}>
          <li>
            <strong>Descripciones que convierten</strong>
            <span>
              Contenido con beneficios, bullets y llamada a la acción en tu tono
              de marca.
            </span>
          </li>
          <li>
            <strong>SEO sin esfuerzo</strong>
            <span>
              Meta títulos, meta descripciones y etiquetas listas para Google, con
              validación de longitud.
            </span>
          </li>
          <li>
            <strong>Alt text automático</strong>
            <span>
              Mejora accesibilidad y posicionamiento en Google Imágenes para todo
              el catálogo.
            </span>
          </li>
          <li>
            <strong>Recomendaciones con IA</strong>
            <span>
              Cross-sell inteligente basado en tu catálogo real y en el producto
              que ve el cliente.
            </span>
          </li>
          <li>
            <strong>Pago a través de Shopify</strong>
            <span>
              49 €/mes con 7 días de prueba, facturado en tu cuenta de Shopify. Sin
              tarjetas fuera de Shopify.
            </span>
          </li>
          <li>
            <strong>Instalación en 1 clic</strong>
            <span>
              Sin código, sin migraciones: se instala dentro de tu admin y
              funciona con tus productos.
            </span>
          </li>
        </ul>
      </section>

      <footer className={styles.footer}>
        <span>ShopGenius AI · SaaS para Shopify</span>
        <span>Hecho con Remix, Polaris y Shopify Admin API</span>
      </footer>
    </main>
  );
}
