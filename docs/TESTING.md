# Plan de pruebas — ShopGenius AI

## 1. Automáticas

```bash
npm run typecheck   # 0 errores
npm test            # 79 tests
npm run build       # build de producción
```

Cobertura actual:

| Área | Tests |
| --- | --- |
| Prompts, parseo de respuestas IA (JSON, markdown, etiquetas duplicadas, alt text) | 8 |
| Modo demo (idioma, HTML escapado) y recomendaciones (filtrado de catálogo) | 6 |
| Proveedores de IA y modelos por defecto | 2 |
| SEO: saneado, truncado, entidades HTML, puntuación, auditoría, `mergeTags` | 11 |
| Planes, límites, lotes y periodos | 9 |
| **Billing API**: variables de `appSubscriptionCreate`, errores, cargos de prueba vs. reales, cancelación, URL de retorno, mensajes de error amigables | 21 |
| **Modo prueba** (`APP_MODE` / `BILLING_TEST_MODE`), días de prueba y versión de API | 6 |
| **Webhooks**: topics de privacidad y reglas de `app_subscriptions/update` | 9 |
| Script `setup-env` (crea el `.env` de modo prueba sin pisar valores) | 7 |
| **Total** | **79** |

Los tests de facturación usan un cliente GraphQL simulado: no hace falta tienda
ni red para comprobar que el cargo se crea como **cargo de prueba** y que un
cargo de prueba nunca concede plan en modo real.

## 2. Smoke test del servidor

```bash
npm run build
set -a; . ./.env; set +a
npm start &
curl -s localhost:3000/healthz        # {"status":"ok",...}
curl -s localhost:3000/ | head        # landing 200
curl -s localhost:3000/auth/login     # login 200
```

## 3. Pruebas manuales en tienda de desarrollo

### 3.1 Instalación

- [ ] Instalar desde el enlace de desarrollo (`npm run dev`).
- [ ] Aceptar scopes `read_products,write_products,write_files`.
- [ ] La app carga embebida y el menú muestra 8 secciones.
- [ ] Aparece el banner «Modo prueba activo» en todas las pantallas.
- [ ] Recargar el admin mantiene la sesión (sin reinstall).
- [ ] Desinstalar y reinstalar funciona sin errores.

### 3.2 Generación y publicación

- [ ] Producto con 1 imagen y sin descripción: genera contenido completo.
- [ ] Producto con 5 imágenes: genera 5 alt text distintos.
- [ ] Verificar en Shopify: descripción HTML, SEO título/descripción, tags.
- [ ] Verificar alt text en el admin (Archivos/Producto).
- [ ] El botón *Aplicar* muestra toast de éxito.
- [ ] El historial marca la generación como *Publicado*.

### 3.3 Generación masiva

- [ ] Seleccionar 3 productos en Free y comprobar que el límite es 3.
- [ ] Generar lote y revisar resultados.
- [ ] Publicar lote y verificar 3 productos en Shopify.
- [ ] Superar el límite del plan muestra aviso y no genera de más.

### 3.4 Auditoría SEO

- [ ] Producto sin SEO aparece como crítico.
- [ ] *Corregir con IA* rellena descripción y metadatos.
- [ ] La puntuación media sube tras corregir.
- [ ] Sin cuota, el botón está deshabilitado o avisa.

### 3.5 Recomendaciones

- [ ] Con 1 solo producto activo muestra error explicativo.
- [ ] Con catálogo variado devuelve 2–4 productos existentes.
- [ ] Ningún `productId` recomendado queda fuera del catálogo.

### 3.6 Facturación (MODO PRUEBA)

- [ ] Plan actual Free y uso 0/10; banner «Modo prueba: cobros simulados».
- [ ] *Elegir Pro* abre la confirmación de Shopify en top-level y Shopify indica
      que es un **cargo de prueba** (no se cobra).
- [ ] Aprobar → vuelve a la app (dentro del admin) → plan Pro, badge «Cargo de
      prueba» y límite 500.
- [ ] Recargar la pantalla de facturación mantiene el plan Pro.
- [ ] Cambiar de Pro a Scale → plan Scale (el aviso de cancelación de Pro no lo
      tumba) y límite 2.000.
- [ ] Cancelar → plan Free y límite 10.
- [ ] Declinar la aprobación en Shopify → la tienda sigue en Free.
- [ ] `GET /healthz` devuelve `"mode":"test"` y `"billingTestMode":true`.

### 3.7 Webhooks y GDPR

- [ ] Desinstalar → log `app/uninstalled` y sesión eliminada.
- [ ] Desde Partners/CLI (`shopify app webhook trigger`), enviar
      `customers/data_request` → 200 en `/webhooks/compliance`.
- [ ] Enviar `customers/redact` → 200.
- [ ] Enviar `shop/redact` → filas de la tienda eliminadas.
- [ ] Reinstalar tras `shop/redact` crea ajustes nuevos.

### 3.8 Ajustes

- [ ] Cambiar proveedor a demo ↔ OpenAI guarda correctamente.
- [ ] Guardar API key y comprobar que no se muestra en claro.
- [ ] Eliminar clave y verificar que vuelve a modo demo.
- [ ] Guardar voz de marca y comprobar que aparece en el prompt (logs).
- [ ] Sin `APP_ENCRYPTION_KEY` aparece el aviso de cifrado.

## 4. Pruebas de usabilidad

- [ ] Todos los textos en español son claros y sin jerga.
- [ ] La vista funciona en 1280×800 y en móvil (admin móvil de Shopify).
- [ ] Los estados de carga se muestran en todos los botones.
- [ ] Los errores explican qué hacer (cuota, API key, producto inexistente).
- [ ] Contraste y foco de teclado correctos (Polaris).

## 5. Regresión antes de publicar

```bash
npm ci
npx prisma migrate deploy
npm run typecheck && npm test && npm run build
```

- [ ] Revisar `shopify.app.toml` (scopes incl. `write_files`, webhooks, URLs).
- [ ] **Modo prueba (estado actual):** `APP_MODE=test` y `BILLING_TEST_MODE=true`.
- [ ] **Solo cuando se decida vender:** `APP_MODE=live` + `BILLING_TEST_MODE=false`,
      `DATABASE_URL` de PostgreSQL y backups de base de datos.
- [ ] Confirmar `APP_ENCRYPTION_KEY`.
