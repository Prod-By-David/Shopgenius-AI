# Plan de pruebas — ShopGenius AI

## 1. Automáticas

```bash
npm run typecheck   # 0 errores
npm test            # 23 tests
npm run build       # build de producción
```

Cobertura actual:

| Área | Tests |
| --- | --- |
| Parseo de respuestas IA (JSON, markdown, llaves anidadas) | 3 |
| Prompts de producto y recomendaciones | 3 |
| Saneado de HTML y truncado | 3 |
| Puntuación SEO y auditoría | 5 |
| Planes, límites y periodos | 5 |
| Modo demo (producto e idioma) | 2 |
| Recomendaciones (filtrado de catálogo) | 3 |

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
- [ ] Aceptar scopes `read_products,write_products`.
- [ ] La app carga embebida y el menú muestra 7 secciones.
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

### 3.6 Facturación (modo test)

- [ ] Plan actual Free y uso 0/10.
- [ ] *Elegir Pro* abre la confirmación de Shopify en top-level.
- [ ] Aprobar → vuelve a la app → plan Pro y límite 500.
- [ ] Cancelar → plan Free y límite 10.
- [ ] `BILLING_TEST_MODE=false` en producción (verificar antes de enviar).

### 3.7 Webhooks y GDPR

- [ ] Desinstalar → log `app/uninstalled` y sesión eliminada.
- [ ] Desde Partners, enviar `customers/data_request` → 200.
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

- [ ] Revisar `shopify.app.toml` (scopes, webhooks, URLs).
- [ ] Confirmar `BILLING_TEST_MODE=false`.
- [ ] Confirmar `APP_ENCRYPTION_KEY` y `DATABASE_URL` de producción.
- [ ] Confirmar backups de base de datos.
