# ShopGenius AI

**Copiloto de IA para tiendas Shopify.** Genera descripciones que venden,
metadatos SEO, etiquetas, alt text para imágenes y recomendaciones cruzadas
(cross-sell) usando el catálogo real de la tienda. Se instala dentro del admin
de Shopify y se cobra con la **Billing API** de Shopify (desde 49 €/mes).

Aplicación construida con **Remix + Polaris + App Bridge + Shopify Admin API +
Prisma**, lista para publicar en la Shopify App Store.

---

## 1. Qué hace

| Funcionalidad | Descripción |
| --- | --- |
| **Descripciones con IA** | HTML limpio y seguro, con beneficios, bullets y llamada a la acción, en 6 idiomas y 6 tonos. |
| **SEO automático** | Meta título (30–60 car.) y meta descripción (120–160 car.), validados y puntuados. |
| **Etiquetas** | 5–10 tags en minúsculas para colecciones automáticas y búsqueda interna. |
| **Alt text** | Un texto alternativo descriptivo por imagen, aplicado vía Admin API. |
| **Generación masiva** | Lotes de 3 a 20 productos según plan, con revisión y publicación en un clic. |
| **Auditoría SEO** | Analiza hasta 50 productos, puntúa 0–100 y corrige con IA. |
| **Recomendaciones** | Cross-sell limitado al catálogo activo, con motivo, idea de pack y afinidad. |
| **Suscripciones** | Free / Starter 19 € / Pro 49 € / Scale 99 € con la Billing API de Shopify. |
| **Multi-proveedor IA** | OpenAI, Anthropic Claude, Qwen (DashScope) y OpenRouter. Modo demo sin coste. |
| **Multi-tienda** | Ajustes, claves cifradas, historial y cuotas por tienda. |

## 2. Stack

- **Remix 2** (framework oficial recomendado por Shopify) + Vite
- **@shopify/shopify-app-remix 4** (auth OAuth embebida, webhooks, billing)
- **Polaris 12** + **App Bridge React 4**
- **Prisma 6** + SQLite (dev) / PostgreSQL (producción)
- **IA**: API HTTP de OpenAI, Anthropic, Qwen o OpenRouter (sin SDKs propietarios)
- **Tests**: Vitest

## 3. Puesta en marcha (15 minutos)

### Requisitos

- Node.js 20.19+ / 22.12+
- Cuenta gratuita de [Shopify Partners](https://partners.shopify.com)
- Tienda de desarrollo de Shopify (se crea desde Partners → Stores)

### Paso a paso

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# genera una clave de cifrado para las API keys de tus clientes
openssl rand -hex 32   # pega el resultado en APP_ENCRYPTION_KEY

# 3. Base de datos
npx prisma migrate deploy
npx prisma generate

# 4. Vincular la app con tu app de Shopify Partners
npm run config:link     # elige "Create a new app" o una existente
npm run dev             # abre el túnel y la app embebida
```

`npm run dev` levanta el túnel, actualiza `SHOPIFY_APP_URL`, instala la app en la
tienda que elijas y abre el admin.

### Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `SHOPIFY_API_KEY` | Sí | Client ID de la app (Partners → App → Client credentials). |
| `SHOPIFY_API_SECRET` | Sí | Client secret. Nunca se expone al cliente. |
| `SHOPIFY_APP_URL` | Sí | URL pública de la app (la pone el CLI en desarrollo). |
| `SCOPES` | Sí | `read_products,write_products`. |
| `DATABASE_URL` | Sí | `file:dev.sqlite` en local; URL de Postgres en producción. |
| `AI_PROVIDER` | No | `demo` (por defecto), `openai`, `anthropic`, `openrouter`, `qwen`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `QWEN_API_KEY` / `OPENROUTER_API_KEY` | No | Claves globales; también se pueden guardar por tienda desde Ajustes. |
| `AI_MODEL` | No | Fuerza un modelo por defecto. |
| `APP_ENCRYPTION_KEY` | Recomendada | Cifra las claves de IA de cada tienda (AES-256-GCM). |
| `BILLING_TEST_MODE` | Sí en dev | `true` = cargos simulados. `false` en producción. |
| `PORT` | No | Puerto del servidor (3000 por defecto). |

## 4. Configurar la app en Shopify Partners

1. **Apps → Create app → Create app manually**. Nombre: `ShopGenius AI`.
2. Copia **Client ID** y **Client secret** a `.env` (`SHOPIFY_API_KEY` y
   `SHOPIFY_API_SECRET`).
3. **Configuration → App URL**: la URL del túnel/dominio.
4. **Allowed redirection URLs**: `https://TU_DOMINIO/auth/callback` y
   `https://TU_DOMINIO/auth/shopify/callback`.
5. **Embedded app**: activado.
6. **Access scopes**: `read_products,write_products`.
7. **Billing**: la app crea los cargos por API; no hay que crearlos a mano.
8. **App Store listing**: usa `docs/APP_STORE_LISTING.md`.

> **Nota de billing:** este repositorio implementa la **Billing API** (Manual
> Pricing), tal y como pide el planteamiento. Shopify recomienda *Shopify App
> Pricing* para apps públicas nuevas; en `docs/DEPLOYMENT.md` (§9) se explica
> cómo convivir con ambas vías sin cambiar los límites de los planes.

## 5. Probar el flujo completo (Fase 4)

1. `npm run dev` e instala en una tienda de desarrollo.
2. **Panel**: comprueba KPIs y aviso de modo demo.
3. **Productos → Optimizar**: genera contenido, revisa y pulsa *Aplicar a
   Shopify*. Verifica en el admin que cambiaron descripción, SEO, tags y alt text.
4. **Generación masiva**: selecciona 3 productos y publica el lote.
5. **Auditoría SEO**: revisa la puntuación y usa *Corregir con IA*.
6. **Plan y facturación**: elige Pro → Shopify muestra la pantalla de aprobación
   (modo test) → acepta → vuelve a la app y comprueba el plan Pro.
7. **Cancelar**: vuelve a Free y verifica que el límite cambia.
8. **Webhooks**: desinstala la app y comprueba en logs `app/uninstalled`;
   `shop/redact` borra los datos.

Checklist detallada en [`docs/TESTING.md`](docs/TESTING.md).

## 6. Planes

| Plan | Precio | Generaciones/mes | Lote máximo |
| --- | --- | --- | --- |
| Free | 0 € | 10 | 3 |
| Starter | 19 € | 150 | 5 |
| **Pro** (recomendado) | **49 €** | 500 | 10 |
| Scale | 99 € | 2.000 | 20 |

Los planes y límites viven en `app/services/plans.server.ts`. **No cambies el
`billingName`** de un plan ya publicado: Shopify lo usa como identificador de la
suscripción. Para cambiar precios, crea un plan nuevo y migra con una campaña.

## 7. Scripts

```bash
npm run dev        # Shopify CLI + túnel + app embebida
npm run build      # build de producción
npm start          # servidor Remix
npm run typecheck  # TypeScript estricto
npm test           # 23 tests (Vitest)
npm run lint       # ESLint
npm run deploy     # despliega configuración/extensions con Shopify CLI
```

## 8. Estructura

```
app/
  routes/
    _index/                 landing pública
    app.tsx                 shell embebido + navegación
    app._index.tsx          dashboard
    app.products.tsx        listado + búsqueda
    app.products.$id.tsx    generador y aplicación a Shopify
    app.bulk.tsx            generación masiva
    app.seo.tsx             auditoría y corrección
    app.recommendations.tsx cross-sell con IA
    app.billing.tsx         planes y suscripción
    app.settings.tsx        proveedor IA y voz de marca
    app.history.tsx         historial
    webhooks.*.tsx          uninstall, scopes y GDPR
  services/
    ai-core.ts              prompts, parseo, demo (puro, testeado)
    ai.server.ts            llamadas a proveedores
    shopify-products.server.ts  Admin API GraphQL
    billing.server.ts       Billing API y sincronización de plan
    shop.server.ts          ajustes, cuotas, historial
    seo.ts                  auditoría y puntuación (puro, testeado)
    plans.server.ts         catálogo de planes (puro, testeado)
    crypto.server.ts        cifrado de claves
prisma/                     schema y migraciones
tests/                      Vitest
docs/                       plan, arquitectura, ficha, privacidad, testing
```

## 9. Despliegue

Guía completa en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Resumen:

1. Base de datos PostgreSQL gestionada.
2. Cambia el provider de Prisma a `postgresql` y genera la migración.
3. Despliega el servidor Node (`npm run build && npm start`) en Render, Railway,
   Fly.io o similar.
4. Actualiza App URL, redirects y `SHOPIFY_APP_URL`.
5. `BILLING_TEST_MODE=false` y `npm run deploy`.
6. Envía a revisión desde Partners.

## 10. Seguridad y privacidad

- Sesiones y tokens gestionados por `@shopify/shopify-app-remix` (nunca en el cliente).
- API keys de IA cifradas con AES-256-GCM (`APP_ENCRYPTION_KEY`).
- HTML generado saneado antes de publicarse (`sanitizeHtml`).
- Webhooks verificados con HMAC por el adaptador oficial.
- Webhooks GDPR obligatorios implementados (`customers/data_request`,
  `customers/redact`, `shop/redact`).
- La app **no almacena datos personales de clientes finales**.
- Política: [`docs/PRIVACY.md`](docs/PRIVACY.md) · Términos: [`docs/TERMS.md`](docs/TERMS.md).

## 11. Documentación del proyecto

- [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) — fases, horas y entregables.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura y flujos.
- [`docs/APP_STORE_LISTING.md`](docs/APP_STORE_LISTING.md) — ficha de la App Store.
- [`docs/TESTING.md`](docs/TESTING.md) — plan de pruebas y criterios de aceptación.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — checklist de publicación.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — despliegue y paso a producción.

## 12. Licencia

MIT — ver [`LICENSE`](LICENSE).
