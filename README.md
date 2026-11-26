# ShopGenius AI

**Copiloto de IA para tiendas Shopify.** Genera descripciones que venden,
metadatos SEO, etiquetas, alt text para imágenes y recomendaciones cruzadas
(cross-sell) usando el catálogo real de la tienda. Se instala dentro del admin
de Shopify y se cobra con la **Billing API** de Shopify (desde 49 €/mes).

Aplicación construida con **Remix + Polaris + App Bridge + Shopify Admin API +
Prisma**, preparada para enviarse a revisión de la Shopify App Store.

> ## 🧪 Proyecto en MODO PRUEBA
>
> Por indicación de dirección, **todos los proyectos se mantienen en modo
> prueba**: los cobros son *cargos de prueba* de Shopify (no se factura nada) y
> la IA arranca en modo demo (sin coste). **Pasar a modo real se decidirá cuando
> se vaya a vender cada producto.** Ver [§4 Modo prueba y modo real](#4-modo-prueba-y-modo-real).

---

## 1. Qué hace

| Funcionalidad | Descripción |
| --- | --- |
| **Descripciones con IA** | HTML limpio y seguro, con beneficios, bullets y llamada a la acción, en 6 idiomas y 6 tonos. |
| **SEO automático** | Meta título (30–60 car.) y meta descripción (120–160 car.), validados y puntuados. |
| **Etiquetas** | 5–10 tags en minúsculas, fusionados con los existentes (nunca se pierden etiquetas del comerciante). |
| **Alt text** | Un texto alternativo descriptivo por imagen, aplicado vía Admin API (`fileUpdate`). |
| **Generación masiva** | Lotes de 3 a 20 productos según plan, con revisión y publicación en un clic. |
| **Auditoría SEO** | Analiza hasta 50 productos, puntúa 0–100 y corrige con IA (puntuación real tras corregir). |
| **Recomendaciones** | Cross-sell limitado al catálogo activo, con motivo, idea de pack y afinidad. |
| **Suscripciones** | Free / **Pro 49 €** / Scale 99 € con la Billing API de Shopify (`appSubscriptionCreate`). |
| **Multi-proveedor IA** | OpenAI, Anthropic Claude, Qwen (DashScope) y OpenRouter. Modo demo sin coste. |
| **Multi-tienda** | Ajustes, claves cifradas, historial y cuotas por tienda. |

El menú de la app tiene 8 secciones: Panel, Productos, Generación masiva,
Auditoría SEO, Recomendaciones, Historial, Plan y facturación y Ajustes.

## 2. Stack

- **Remix 2** (framework recomendado por Shopify) + Vite
- **@shopify/shopify-app-remix 4** (auth embebida, webhooks) + **Admin GraphQL API 2026-10**
- **Billing API de Shopify** vía Admin GraphQL (`appSubscriptionCreate`, `appSubscriptionCancel`)
- **Polaris 12** + **App Bridge React 4**
- **Prisma 6** + SQLite (modo prueba / desarrollo) · PostgreSQL para producción real
- **IA**: API HTTP de OpenAI, Anthropic, Qwen o OpenRouter (sin SDKs propietarios)
- **Tests**: Vitest (79 tests)

## 3. Puesta en marcha

### Requisitos

- Node.js 20.19+ / 22.12+
- **Shopify CLI** instalada globalmente: `npm install -g @shopify/cli@latest`
- Cuenta gratuita de [Shopify Partners](https://partners.shopify.com)
- Tienda de desarrollo de Shopify (Partners → Stores)

### Paso a paso

```bash
# 1. Dependencias y Shopify CLI
npm install
npm install -g @shopify/cli@latest

# 2. Arrancar (crea .env, genera Prisma, migra la base de datos y abre el túnel)
npm run dev
```

`npm run dev` hace todo lo necesario: **crea `.env` automáticamente en modo
prueba** (`DATABASE_URL=file:dev.sqlite`, `APP_MODE=test`,
`BILLING_TEST_MODE=true` y una `APP_ENCRYPTION_KEY` aleatoria; nunca pisa lo que
ya tengas), ejecuta `prisma generate` y `prisma migrate deploy`, levanta el
túnel, actualiza la URL de la app e instala la app en la tienda que elijas.
`shopify.app.toml` ya trae el `client_id`, los scopes y los webhooks.

> **No ejecutes `npm run config:link`** salvo que cambies de app en Partners:
> ese comando **sobrescribe `shopify.app.toml`** con la configuración remota y
> pierde los webhooks y el scope `write_files`. Si lo haces, restaura el archivo
> del repositorio (conservando el `client_id` nuevo).

Tienes un `.env.example` documentado por si prefieres escribir el `.env` a mano.

### Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `SHOPIFY_API_KEY` | Sí | Client ID de la app (Partners → App → Client credentials). |
| `SHOPIFY_API_SECRET` | Sí | Client secret. Nunca se expone al cliente. |
| `SHOPIFY_APP_URL` | Sí | URL pública de la app (la pone el CLI en desarrollo). |
| `SCOPES` | Sí | `read_products,write_products,write_files` (`write_files` es necesario para el alt text de las imágenes). |
| `SHOPIFY_API_VERSION` | No | Versión de la Admin API. Por defecto `2026-10`. |
| `DATABASE_URL` | Sí | `file:dev.sqlite` en modo prueba; URL de Postgres en producción real. |
| `APP_MODE` | No | `test` (por defecto) o `live`. Ver §4. |
| `BILLING_TEST_MODE` | No | `true` (por defecto) = cargos de prueba. Ver §4. |
| `BILLING_TRIAL_DAYS` | No | Días de prueba gratuita de la suscripción de pago (0–30, por defecto 0). |
| `AI_PROVIDER` | No | `demo` (por defecto), `openai`, `anthropic`, `openrouter`, `qwen`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `QWEN_API_KEY` / `OPENROUTER_API_KEY` | No | Claves globales; también se pueden guardar por tienda desde Ajustes. |
| `AI_MODEL` / `AI_BASE_URL` | No | Fuerzan un modelo / endpoint por defecto. |
| `APP_ENCRYPTION_KEY` | Recomendada | Cifra las claves de IA de cada tienda (AES-256-GCM). |
| `PORT` | No | Puerto del servidor (3000 por defecto). |

## 4. Modo prueba y modo real

**Estado actual: MODO PRUEBA** (`APP_MODE=test`, `BILLING_TEST_MODE=true`).

| Qué | En modo prueba (actual) | En modo real (futuro) |
| --- | --- | --- |
| Cobros | `appSubscriptionCreate` con `test: true`: Shopify permite aprobar y cancelar **sin cobrar nada** | Cargos reales de 49 € / 99 € al mes |
| Aviso en la app | Banner «Modo prueba activo» en toda la app | Sin banner |
| IA | `AI_PROVIDER=demo` (contenido de ejemplo, sin coste) | El proveedor elegido (OpenAI, Claude, Qwen…) |
| Base de datos | SQLite | PostgreSQL recomendado |

Para pasar a modo real hay que cambiar **a propósito dos interruptores a la
vez** (con cualquier otra combinación los cargos siguen siendo de prueba):

```env
APP_MODE=live
BILLING_TEST_MODE=false
```

Esa decisión se tomará cuando se vaya a vender cada producto. Mientras tanto no
hay que tocar nada: el proyecto se queda en modo prueba por defecto, incluso si
faltan las variables. En modo real, los cargos de prueba existentes dejan de
conceder plan.

## 5. Configurar la app en Shopify Partners

1. **Apps → Create app → Create app manually**. Nombre: `ShopGenius AI`.
2. Copia **Client ID** y **Client secret** a `.env` (`SHOPIFY_API_KEY` y
   `SHOPIFY_API_SECRET`).
3. **Configuration → App URL**: la URL del túnel/dominio.
4. **Allowed redirection URLs**: `https://TU_DOMINIO/auth/callback`.
5. **Embedded app**: activado.
6. **Access scopes**: `read_products,write_products,write_files`.
7. **Webhooks**: los declara `shopify.app.toml` (`npm run dev` los aplica a la
   tienda de desarrollo y `npm run deploy` los publica): desinstalación, cambio
   de scopes, `app_subscriptions/update` y los tres obligatorios de privacidad
   (`compliance_topics` → `/webhooks/compliance`).
8. **Distribución**: en Partners → tu app → **Distribución**, elige **distribución
   pública** (App Store). Shopify no permite la Billing API en apps de
   distribución personalizada (error «Apps without a public distribution cannot
   use the Billing API»). Elegirla no publica la app.
9. **Billing**: la app crea los cargos por API; no hay que crearlos a mano.

> **Nota de billing:** este repositorio implementa la **Billing API** de Shopify
> (suscripción recurrente creada por la app), tal y como pide el planteamiento.
> Shopify también ofrece un modelo de precios gestionado desde Partners; ver
> `docs/DEPLOYMENT.md` (§9) para valorar esa vía cuando se decida vender.

## 6. Solución de problemas

| Síntoma | Causa y solución |
| --- | --- |
| `Environment variable not found: DATABASE_URL` (P1012) | Falta `.env`. `npm run dev` ya lo crea; si ejecutas Prisma a mano, lanza antes `npm run setup:env`. |
| `sh: shopify: not found` | Instala el CLI: `npm install -g @shopify/cli@latest`. |
| Se pierden webhooks / `write_files` tras vincular | `config:link` sobrescribió `shopify.app.toml`. Restáuralo del repositorio (§3). |
| Tras aplicar aparece el aviso «No se pudieron actualizar los alt text…» | La app instalada no tiene el scope `write_files` (descripción, SEO y etiquetas sí se aplican). Con el `shopify.app.toml` del repositorio, `npm run dev` lo concede; si no, reinstala la app en la tienda de desarrollo. |
| «Apps without a public distribution cannot use the Billing API» | Partners → tu app → Distribución → distribución pública (§5, punto 8). |
| En Codespaces la app muestra un login de GitHub o «refused to connect» | En la pestaña **Puertos** de Codespaces, pon el puerto del túnel (4040) en visibilidad **Pública**. |
| `npm warn install-scripts … not yet covered by allowScripts` | Aviso de npm; no afecta: Prisma se genera en `predev`/`setup`. |
| `Blocked request. This host is not allowed` (Vite) | Arranca siempre con `npm run dev` (el CLI define `SHOPIFY_APP_URL`); `vite.config.ts` ya permite ese host. |
| `Failed to load session` / vuelta a la pantalla de login | Borra `prisma/dev.sqlite` y relanza `npm run dev` (se recrea con las migraciones). |

## 7. Probar el flujo completo (Fase 4)

1. `npm run dev` e instala en una tienda de desarrollo.
2. **Panel**: comprueba KPIs y el aviso de modo prueba / modo demo.
3. **Productos → Optimizar**: genera contenido, revisa y pulsa *Aplicar a
   Shopify*. Verifica en el admin que cambiaron descripción, SEO, tags y alt text.
4. **Generación masiva**: selecciona 3 productos y publica el lote.
5. **Auditoría SEO**: revisa la puntuación y usa *Corregir con IA*.
6. **Plan y facturación**: elige Pro → Shopify muestra la pantalla de aprobación
   (**cargo de prueba**) → acepta → vuelve a la app y comprueba el plan Pro.
7. **Cancelar**: vuelve a Free y verifica que el límite cambia.
8. **Webhooks**: desinstala la app y comprueba en logs `app/uninstalled`;
   `shop/redact` borra los datos.

Checklist detallada en [`docs/TESTING.md`](docs/TESTING.md).

## 8. Planes

| Plan | Precio | Generaciones/mes | Lote máximo |
| --- | --- | --- | --- |
| Free | 0 € | 10 | 3 |
| **Pro** (recomendado) | **49 €/mes** | 500 | 10 |
| Scale | 99 €/mes | 2.000 | 20 |

Los planes y límites viven en `app/services/plans.server.ts`. **No cambies el
`billingName`** de un plan ya publicado: Shopify lo usa como identificador de la
suscripción. Para cambiar precios, crea un plan nuevo y migra con una campaña.

## 9. Scripts

```bash
npm run dev        # crea .env (modo prueba) + Prisma + Shopify CLI + túnel + app embebida
npm run setup:env  # solo crea/completa .env en modo prueba (sin pisar tus valores)
npm run build      # build de producción
npm start          # servidor Remix
npm run typecheck  # TypeScript estricto
npm test           # 79 tests (Vitest)
npm run lint       # ESLint
npm run deploy     # despliega configuración (toml, webhooks) con Shopify CLI
```

## 10. Estructura

```
app/
  config.server.ts          modo prueba/real, versión de API (puro, testeado)
  routes/
    _index/                 landing pública
    app.tsx                 shell embebido + navegación + banner de modo prueba
    app._index.tsx          dashboard
    app.products.tsx        listado + búsqueda
    app.products.$id.tsx    generador y aplicación a Shopify
    app.bulk.tsx            generación masiva
    app.seo.tsx             auditoría y corrección
    app.recommendations.tsx cross-sell con IA
    app.billing.tsx         planes y suscripción
    app.settings.tsx        proveedor IA y voz de marca
    app.history.tsx         historial
    webhooks.app.*.tsx      desinstalación y cambio de scopes
    webhooks.app_subscriptions.update.tsx   sincroniza el plan con Shopify
    webhooks.compliance.tsx webhooks obligatorios de privacidad (RGPD)
    healthz.tsx             endpoint de salud
  services/
    ai-core.ts              prompts, parseo, demo (puro, testeado)
    ai-providers.ts         proveedores y modelos por defecto (única fuente)
    ai.server.ts            llamadas a proveedores
    shopify-products.server.ts  Admin API GraphQL
    billing-core.ts         Billing API: mutaciones y reglas (puro, testeado)
    billing.server.ts       sincronización del plan con Shopify
    webhook-logic.ts        reglas de webhooks (puro, testeado)
    shop.server.ts          ajustes, cuotas, historial
    seo.ts                  auditoría y puntuación (puro, testeado)
    plans.server.ts         catálogo de planes (puro, testeado)
    crypto.server.ts        cifrado de claves
scripts/setup-env.mjs       crea .env en modo prueba si falta (DATABASE_URL, etc.)
prisma/                     schema y migraciones (SQLite)
tests/                      Vitest
docs/                       plan, arquitectura, ficha, privacidad, testing
```

## 11. Despliegue

Guía completa en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Resumen:

1. Despliega el servidor Node (`npm run build && npm start`, o el `Dockerfile`)
   en Render, Railway, Fly.io o similar, manteniendo el **modo prueba**.
2. Actualiza App URL, redirects y `SHOPIFY_APP_URL`; `npm run deploy`.
3. Cuando se decida vender: PostgreSQL + `APP_MODE=live` +
   `BILLING_TEST_MODE=false` y enviar a revisión desde Partners.

## 12. Seguridad y privacidad

- Sesiones y tokens gestionados por `@shopify/shopify-app-remix` (nunca en el cliente).
- API keys de IA cifradas con AES-256-GCM (`APP_ENCRYPTION_KEY`).
- HTML generado saneado antes de publicarse (`sanitizeHtml`) y modo demo con HTML escapado.
- Webhooks verificados con HMAC por el adaptador oficial.
- Webhooks de privacidad obligatorios implementados (`customers/data_request`,
  `customers/redact`, `shop/redact`).
- La app **no almacena datos personales de clientes finales**.
- Política: [`docs/PRIVACY.md`](docs/PRIVACY.md) · Términos: [`docs/TERMS.md`](docs/TERMS.md).

## 13. Documentación del proyecto

- [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) — fases, horas y entregables.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura y flujos.
- [`docs/APP_STORE_LISTING.md`](docs/APP_STORE_LISTING.md) — borrador de la ficha de la App Store.
- [`docs/TESTING.md`](docs/TESTING.md) — plan de pruebas y criterios de aceptación.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — checklist previo a la publicación.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — despliegue y paso a modo real.

## 14. Licencia

MIT — ver [`LICENSE`](LICENSE).
