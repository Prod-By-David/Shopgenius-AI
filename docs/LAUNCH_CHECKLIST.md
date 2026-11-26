# Checklist de publicación — Shopify App Store

> **Estado: MODO PRUEBA.** El proyecto se entrega «listo para enviar a revisión»
> pero **no se envía**: por indicación de dirección, pasar a modo real y publicar
> se decidirá cuando se vaya a vender. Los puntos marcados como **[modo real]**
> solo se aplican en ese momento.

## 1. Requisitos técnicos

- [ ] App embebida con App Bridge y Polaris.
- [ ] OAuth con `read_products,write_products,write_files` (mínimos necesarios; `write_files` para el alt text).
- [ ] Sesiones persistidas y tokens offline/online correctos.
- [ ] Webhooks verificados con HMAC.
- [ ] Webhooks de privacidad obligatorios (`compliance_topics` → `/webhooks/compliance`):
  - [ ] `customers/data_request`
  - [ ] `customers/redact`
  - [ ] `shop/redact`
- [ ] `app/uninstalled` limpia sesiones.
- [ ] `app_subscriptions/update` sincroniza el plan.
- [ ] Billing API con planes Free/Pro (49 €)/Scale (99 €).
- [ ] **Modo prueba (estado actual):** `APP_MODE=test` y `BILLING_TEST_MODE=true`.
- [ ] **[modo real]** `APP_MODE=live` y `BILLING_TEST_MODE=false` (los dos a la vez).
- [ ] URLs de la app y redirects actualizadas al dominio final.
- [ ] HTTPS válido y sin mixed content.
- [ ] `/healthz` responde 200 para monitorización.

## 2. Calidad y UX

- [ ] Sin errores en consola del navegador.
- [ ] Estados de carga, vacío y error en todas las pantallas.
- [ ] Textos en español revisados; inglés en la ficha.
- [ ] Responsive en admin móvil.
- [ ] Accesibilidad básica: foco, contraste, etiquetas en formularios.
- [ ] Tiempo de carga inicial < 3 s.
- [ ] Sin lorem ipsum ni datos de demo visibles en la ficha.

## 3. Legal y privacidad

- [ ] Política de privacidad pública (`docs/PRIVACY.md`).
- [ ] Términos de servicio públicos (`docs/TERMS.md`).
- [ ] Email de soporte y tiempos de respuesta.
- [ ] Declaración de subencargados (OpenAI/Anthropic/Qwen/OpenRouter + hosting).
- [ ] Confirmar que no se almacenan datos personales de clientes finales.
- [ ] Retención: historial hasta 12 meses; borrado en `shop/redact`.

## 4. Ficha de la App Store

- [ ] Nombre, tagline y descripciones ES/EN.
- [ ] Icono 1200×1200 y 6 capturas 1280×800.
- [ ] Vídeo demo (opcional pero recomendable).
- [ ] Categoría: Store design / SEO.
- [ ] Precios coincidentes con la Billing API.
- [ ] Notas para el revisor con instrucciones de modo demo.
- [ ] Enlace a soporte y documentación.

## 5. Antes de pulsar «Enviar a revisión»

```bash
npm ci
npx prisma migrate deploy
npm run typecheck && npm test && npm run build
```

- [ ] Probar instalación desde un enlace limpio en una tienda nueva.
- [ ] Probar el cobro con una tienda de desarrollo (cargo de prueba de Shopify).
- [ ] **[modo real]** PostgreSQL en producción y migración inicial generada.
- [ ] Revisar logs del servidor durante 24 h.
- [ ] Backup de base de datos configurado.
- [ ] Monitorización/alertas de `/healthz`.

## 6. Después de la aprobación **[modo real]**

- [ ] Publicar la ficha.
- [ ] Verificar cobros reales en el primer cliente.
- [ ] Revisar errores y feedback de los primeros comerciantes.
- [ ] Iterar el onboarding según abandono.
