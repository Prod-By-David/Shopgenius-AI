# Plan de proyecto — ShopGenius AI

Proyecto: app SaaS de IA para Shopify, publicada en la Shopify App Store con
suscripción mensual desde 49 €/mes.
Presupuesto de desarrollo: **13 horas prácticas** + **2 días de validación**.

---

## 1. Alcance funcional

### Incluido en el MVP

1. App embebida en Remix con OAuth de Shopify y Polaris.
2. Generación de descripciones HTML, meta título, meta descripción, etiquetas,
   alt text y bullets con IA.
3. Aplicación del contenido a Shopify vía Admin GraphQL.
4. Generación masiva por lotes con revisión y publicación.
5. Auditoría SEO con puntuación 0–100 y corrección asistida.
6. Recomendaciones cruzadas limitadas al catálogo real.
7. Suscripción con la Billing API (Free, Starter, Pro, Scale) y límites por plan.
8. Panel de uso, historial, ajustes de proveedor y voz de marca.
9. Webhooks de desinstalación, scopes y privacidad (GDPR).

### Fuera del MVP (backlog v1.1)

- Extensión de tema (Theme App Extension) para mostrar recomendaciones en la
  tienda online.
- Generación de descripciones de colecciones y páginas.
- Traducción masiva multi-idioma con Shopify Markets.
- Programación de tareas en background (cola) para catálogos >1.000 productos.
- Analítica de conversión por contenido (A/B testing de descripciones).

---

## 2. Fases, horas y entregables

### Fase 1 — Estructura e integración con Shopify (4 h)

| Tarea | Horas | Estado |
| --- | --- | --- |
| Scaffolding Remix + Vite + TypeScript estricto | 0,5 | Hecho |
| Configuración `shopify.app.toml`, scopes y redirects | 0,5 | Hecho |
| Autenticación embebida y almacenamiento de sesiones con Prisma | 0,75 | Hecho |
| Shell Polaris + App Bridge + navegación | 0,75 | Hecho |
| Webhooks de instalación/desinstalación/scopes | 0,5 | Hecho |
| Landing pública y login manual | 0,5 | Hecho |
| Verificación de instalación en tienda de desarrollo | 0,5 | Hecho (código) |

**Resultado:** app instalable, sesión persistida y panel navegable.

### Fase 2 — Motor de IA (4 h)

| Tarea | Horas | Estado |
| --- | --- | --- |
| Cliente multi-proveedor (OpenAI, Anthropic, Qwen, OpenRouter) | 1 | Hecho |
| Prompts con salida JSON estricta y límites SEO | 0,75 | Hecho |
| Parseo robusto, saneado de HTML y fallbacks | 0,5 | Hecho |
| Lectura de productos e imágenes vía Admin API | 0,75 | Hecho |
| Aplicación de descripción, SEO, tags y alt text | 0,5 | Hecho |
| UI de generación con vista previa y puntuación | 0,5 | Hecho |

**Resultado:** contenido real generado y publicado en segundos, con modo demo
sin coste para pruebas.

### Fase 3 — Suscripción y cobro (3 h)

| Tarea | Horas | Estado |
| --- | --- | --- |
| Catálogo de planes y límites | 0,5 | Hecho |
| `billing.request` / `billing.check` con la Billing API | 1 | Hecho |
| Sincronización del plan y cuotas mensuales | 0,5 | Hecho |
| Pantalla de planes y cancelación | 0,5 | Hecho |
| Modo test y documentación de paso a producción | 0,5 | Hecho |

**Resultado:** pasarela recurrente 100 % gestionada por Shopify.

### Fase 4 — Pruebas y validación (2 h + 2 días de margen)

| Tarea | Horas | Estado |
| --- | --- | --- |
| Tests unitarios (prompts, parsing, SEO, planes) | 0,5 | Hecho (23 tests) |
| Typecheck + build de producción + smoke test | 0,5 | Hecho |
| Guion de pruebas manuales (instalación, IA, cobro) | 0,5 | Hecho |
| Checklist de revisión de la App Store | 0,5 | Hecho |

**Resultado:** build reproducible, tests verdes y checklist de envío.

---

## 3. Calendario de validación (2 días)

### Día 1 — Instalación y funcionalidad

- Instalación limpia en tienda de desarrollo (nueva, sin sesiones previas).
- Generar y aplicar contenido en 3 productos con imágenes.
- Lote de 5 productos y verificación en el admin.
- Auditoría SEO y corrección de 2 productos.
- Recomendaciones con catálogo de 10+ productos.
- Revisión de textos en español e inglés y de la vista embebida (móvil/desktop).

### Día 2 — Cobro y revisión

- Suscripción al plan Pro en modo test y verificación del ciclo completo.
- Cambio de plan y cancelación; comprobación de límites.
- Desinstalación/reinstalación y webhooks en logs.
- Solicitud de datos GDPR simulada desde Partners.
- Revisión de la ficha de la App Store y envío a revisión.

---

## 4. Criterios de aceptación

1. La app se instala sin errores y carga en < 3 s en el admin.
2. Una generación completa tarda < 20 s con proveedor real y < 1 s en demo.
3. El contenido aplicado aparece en Shopify (descripción, SEO, tags, alt).
4. Los límites por plan se respetan y se muestran en la UI.
5. El cobro se crea, sincroniza y cancela correctamente.
6. `npm run typecheck`, `npm test` y `npm run build` pasan sin errores.
7. No se almacenan datos personales de clientes finales.
8. GDPR: los tres webhooks responden 200 y `shop/redact` borra los datos.

---

## 5. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Cambios de versión de la Admin API | Medio | Versión fijada (`2025-01`) y cliente GraphQL centralizado. |
| Coste de IA descontrolado | Medio | Cuotas por plan, modo demo y límite de tokens por llamada. |
| Claves de IA mal protegidas | Alto | Cifrado AES-256-GCM y nunca exposición al cliente. |
| Rechazo en revisión de Shopify | Medio | Checklist de `docs/LAUNCH_CHECKLIST.md` y webhooks GDPR. |
| SQLite en producción | Alto | Guía de migración a PostgreSQL en `docs/DEPLOYMENT.md`. |
| Latencia en lotes grandes | Medio | Lotes acotados y feedback de progreso; cola en v1.1. |

---

## 6. Monetización

- **Precio ancla:** Pro 49 €/mes (recomendado) con 500 generaciones.
- **Entrada:** Starter 19 € para tiendas pequeñas; Free 10 generaciones como
  prueba del producto.
- **Escalado:** Scale 99 € para catálogos grandes y agencias.
- **Coste variable estimado:** < 0,01 € por generación con `gpt-4o-mini`;
  margen bruto > 95 % en el plan Pro.
- **Canal:** búsqueda interna de la Shopify App Store (keywords en la ficha) +
  contenido SEO propio + partnership con agencias Shopify.

---

## 7. Diferencial

1. **Todo en uno dentro del admin**: descripción + SEO + alt text + tags +
   cross-sell, sin exportar a otra herramienta.
2. **Aplicación real a Shopify**, no solo "copiar y pegar".
3. **Multi-proveedor de IA** con claves propias del comerciante (coste
   transparente y sin lock-in).
4. **Modo demo** para probar antes de pagar y para revisiones de la App Store.
5. **Puntuación SEO objetiva** que justifica el valor y guía la corrección.
6. **Precio plano** frente a competidores que cobran por crédito.
