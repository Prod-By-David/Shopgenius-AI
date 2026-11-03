# Despliegue y paso a producción

## 1. Base de datos

SQLite es solo para desarrollo. En producción usa PostgreSQL gestionado
(Railway, Render, Neon, Supabase…).

1. Crea la base de datos y copia la URL.
2. Edita `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Elimina `prisma/migrations` (histórico SQLite) y genera la migración inicial:

```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init_postgres
```

4. En el servidor: `npx prisma migrate deploy`.

> Guarda una copia de la migración en el repositorio. No uses `db push` en
> producción.

## 2. Hosting del servidor Node

Requisitos: Node 20.19+/22.12+, variables de entorno y HTTPS.

### Render / Railway (recomendado)

1. Conecta el repositorio de GitHub.
2. **Build command:** `npm ci && npx prisma generate && npm run build`
3. **Start command:** `npm start`
4. Añade las variables de entorno (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
   `SHOPIFY_APP_URL`, `SCOPES`, `DATABASE_URL`, `APP_ENCRYPTION_KEY`,
   `AI_PROVIDER`, `BILLING_TEST_MODE=false`).
5. Health check: `/healthz`.

### Docker

```bash
docker build -t shopgenius-ai .
docker run -p 3000:3000 --env-file .env shopgenius-ai
```

## 3. Configuración en Shopify Partners

1. **App URL:** `https://TU_DOMINIO/`
2. **Allowed redirections:**
   - `https://TU_DOMINIO/auth/callback`
   - `https://TU_DOMINIO/auth/shopify/callback`
3. **Embedded:** sí.
4. **Scopes:** `read_products,write_products`.
5. **Webhooks:** se registran automáticamente desde `shopify.app.toml` al
   ejecutar `npm run deploy`; verifica en Partners → API access.
6. Ejecuta `npm run deploy` para publicar configuración y extensiones.

## 4. Billing en producción

- `BILLING_TEST_MODE=false`.
- Los planes se crean en el primer `billing.request` con el nombre exacto de
  `plans.server.ts`. Shopify guarda ese nombre: no lo cambies sin migración.
- Verifica en **Settings → Billing** que los cargos aparecen en EUR.
- Prueba con una tienda de desarrollo y el modo test de Shopify antes de facturar
  a clientes reales.

## 5. Seguridad en producción

- `APP_ENCRYPTION_KEY` con 32 bytes aleatorios (`openssl rand -hex 32`).
- Rotación de claves: descifrar con la antigua y volver a cifrar con la nueva
  (script de mantenimiento puntual).
- Backups diarios de la base de datos.
- Logs con retención ≥ 30 días.
- Alertas de errores 5xx y de `/healthz`.
- No subir `.env` al repositorio.

## 6. Dominio y TLS

- Usa el dominio raíz o subdominio con certificado válido.
- Actualiza `SHOPIFY_APP_URL` y vuelve a desplegar.
- Si usas Cloudflare, desactiva el bloqueo de bots para webhooks de Shopify.

## 7. Revisión y publicación

Sigue `docs/LAUNCH_CHECKLIST.md` y envía la app desde Partners →
**Distribution → Submit for review**.

Tiempos típicos de revisión: 3–10 días laborables. Atiende los comentarios del
revisor en el mismo hilo y vuelve a enviar.

## 8. Post-lanzamiento

- Monitoriza generaciones fallidas por proveedor.
- Revisa coste medio por generación (tokens × tarifa).
- Añade Sentry o similar para errores de servidor.
- Prepara la v1.1 con cola de trabajos y Theme App Extension.

## 9. Shopify App Pricing (managed pricing) vs. Billing API

Shopify ofrece dos vías de cobro:

| Vía | Cómo funciona | Cuándo usarla |
| --- | --- | --- |
| **Shopify App Pricing** (antes Managed Pricing) | Los planes se definen en el formulario de envío de la app; Shopify aloja la página de planes y gestiona prorrateos y trials. | Es la opción **por defecto para apps públicas nuevas** y la recomendada por Shopify. |
| **Manual Pricing (Billing API)** | La app crea los cargos con `appSubscriptionCreate`; es la implementación incluida en este repositorio. | Apps con requisitos que Shopify App Pricing aún no cubre, o apps existentes con Billing API. |

El planteamiento del proyecto exige explícitamente la **Billing API**, por lo que
`app.billing.tsx` usa `billing.request` / `billing.check` y los planes viven en
`app/services/plans.server.ts`.

Si al enviar la app Shopify exige Shopify App Pricing:

1. Define los mismos cuatro planes (Free, Starter 19 €, Pro 49 €, Scale 99 €) en
   el formulario de envío de Partners.
2. Mantén el código actual: `billing.check` sigue leyendo la suscripción activa y
   el webhook `app_subscriptions/update` mantiene el plan sincronizado.
3. Sustituye la acción `subscribe` para abrir la página de planes de Shopify
   (`https://admin.shopify.com/store/{handle}/charges/{app-handle}/pricing_plans`)
   o usa el enlace que Shopify facilita en el panel de la app.
4. No crees cargos con la Billing API si la app ya está en Shopify App Pricing:
   Shopify no permite mezclar ambos sistemas en una app pública nueva.

En ambos casos, los límites de generaciones y los planes de
`plans.server.ts` deben coincidir con lo configurado en Partners.
