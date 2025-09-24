# Opciones para automatizar ingestión desde JWPlayer (sin API plan)

Resumen rápido de alternativas y recomendación práctica.

1) Scraping HTML estático (actual script)
- Cómo funciona: descarga la página y extrae el objeto pasado a `jwplayer(...).setup({...})` o arrays `playlist: [...]`.
- Ventajas: simple, sin dependencias pesadas, rápido, bajo uso de recursos.
- Limitaciones: falla si la página genera la configuración por JavaScript en runtime (single-page apps, client-side rendering).
- Seguridad: validar hosts permitidos, rate-limit y saneamiento de HTML.

2) Headless Browser (Playwright / Puppeteer)
- Cómo funciona: carga la página en un navegador headless, espera a que el JS ejecute y lee `window.jwplayer()` o el DOM.
- Ventajas: robusto contra SPAs y JS dinámico.
- Limitaciones: más costoso (CPU/mem), dependencias nativas, complejidad de despliegue.

3) Export manual / ingestion push
- Cómo funciona: proveedor/exporta playlists a un bucket (S3/FTP) o webhook hacia tu backend.
- Ventajas: más fiable y controlado.
- Limitaciones: requiere coordinación con quien administra JWPlayer/hosting.

4) Integración de terceros / scraping-as-a-service
- Servicios que ofrecen extracción de contenido y web data.
- Ventajas: externaliza mantenimiento.
- Desventajas: coste y dependencia externa.

Recomendación práctica para el plan actual (sin API directa):
- Empezar con la aproximación 1 (scraping estático) usando `scripts/jw_ingest.py`.
- Configurar timer/systemd para ejecutarlo cada 4-6 horas.
- Monitorizar fallos; si detectas que muchos dominios requieren JS para construir la config, migrar a Playwright.

Checklist operativo:
- [ ] Definir `scripts/jw_sources.json` con las páginas a rastrear.
- [ ] Colocar `API_TOKEN` en entorno seguro.
- [ ] Agregar logging y alertas (Sentry) en errores críticos.
- [ ] Añadir backoff y reintentos en caso de 5xx/429.
- [ ] Respetar robots.txt y TOS del sitio objetivo.

