## API de La Cajita TV

Resumen rápido
- Backend: FastAPI con Auth0 (RS256) como proveedor de identidad.
- Base local: http://127.0.0.1:8001
- Seguridad: JWT Bearer emitido por Auth0 con audience de la API. Las credenciales M2M se usan solo en el backend.
- Endpoint público de configuración: GET /config/public (solo claves VITE_ seguras).

### Variables de entorno (backend)
- AUTH0_DOMAIN: dominio de Auth0. Ej: segrd.us.auth0.com
- AUTH0_API_AUDIENCE: audience del API (la “Identifier” del recurso en Auth0). Ej: https://<tu-api>/api
- AUTH0_MGMT_CLIENT_ID: Client ID de la app M2M (Management API)
- AUTH0_MGMT_CLIENT_SECRET: Client Secret de la app M2M (no exponer en frontend)
- SECRET_KEY: clave local para proteger POST /auth/client-credentials
- DB_HOST, DB_USER, DB_PASSWORD, DB_NAME: conexión MySQL
- CORS_ORIGINS, CORS_METHODS, CORS_HEADERS, CORS_CREDENTIALS: CORS
- LIVETV_API_URL: URL externa de Live TV (opcional)
- SENTRY_DSN, ENVIRONMENT, RELEASE: monitoreo (opcional)

Notas
- No existen secretos con prefijo VITE_. Todo lo sensible vive solo en backend.
- El frontend obtiene la configuración segura desde /config/public.

### Autenticación
Los endpoints protegidos requieren un JWT de Auth0 con audience AUTH0_API_AUDIENCE.

Pasos típicos
1) Registrar una API en Auth0 y usar su Identifier como AUTH0_API_AUDIENCE.
2) En el SPA, iniciar sesión con Auth0 y solicitar un access token para esa audience (solo para llamar endpoints de este backend, no para Management API).
3) Enviar Authorization: Bearer <token> en cada request protegido.

Alternativas de prueba (backend)
- POST /auth/client-credentials: emite un token usando la app M2M; requiere body { "client_secret": "SECRET_KEY" }. Útil para tests, no para frontend.

### Endpoints principales
Salud y configuración pública
- GET /health: estado del servicio.
- GET /config/public: devuelve { public_config: { VITE_*: value } }.

Autenticación y usuario
- GET /user/me: devuelve claims básicos del usuario autenticado.
- POST /auth0/users: crea un usuario en Auth0 (usa Management API).
- POST /login: Resource Owner Password Grant, solo para backoffice/tests.
- POST /auth/client-credentials: client credentials grant (protegido por SECRET_KEY).

Contenido (con JWT válido)
- GET /categories: categorías.
- GET /segments y GET /allsegments: segmentos.
- GET /manplaylists: playlists con relaciones.
- GET /seasons: temporadas con videos.
- POST /uiplaylist, /dplaylist, /iuseason, /iuseasonvideos, /usegments: operaciones de mantenimiento (CRUD).
- Gestión de imágenes: GET /images, GET /images/{filename}, GET /getcover?filename=..., POST /upload-image.

Observación
Existen dos implementaciones equivalentes en este repositorio (Api.py y lacajitaapi.py). Comparten el mismo esquema de seguridad, endpoints y propósito. En despliegue, utiliza una sola de ellas para evitar confusiones. Este documento aplica a ambas.

### CORS
Controlado por variables CORS_*. Por defecto se permite http://localhost:5174 para desarrollo.

### Puesta en marcha
Opción 1: script simple
- python3 lacajitaapi.py (o Api.py)

Opción 2: uvicorn
- uvicorn Api:app --host 0.0.0.0 --port 8001

Verifica
- GET http://127.0.0.1:8001/health → 200
- GET http://127.0.0.1:8001/config/public → contiene solo VITE_*

### Dashboard (métricas)
- GET /dashboard/customers-summary
	- Totales, activos (healthy o con conexiones), nuevos (según fecha), verificados/baneados.
- GET /dashboard/customers-demographic
	- Distribución por flags (email_verified/banned), dominios de email, países si existen.
Notas: ambas usan Auth0 Management API con caché en memoria configurable.

### Buenas prácticas
- Nunca expongas en frontend AUTH0_MGMT_CLIENT_SECRET ni ninguna credencial de servidor.
- Usa /auth/client-credentials solo desde el backend y protégelo con SECRET_KEY.
- Mantén AUTH0_API_AUDIENCE consistente entre Auth0, backend y el token solicitado por el SPA.

### Cloudflare Tunnel y WAF
- Si el subdominio público devuelve 1033: asegura que el DNS en la zona correcta es CNAME a `<TUNNEL_ID>.cfargotunnel.com`.
- Si devuelve 403 (cf-mitigated: challenge): crea una regla WAF “Skip” para el hostname (y opcional path) para omitir Bot Fight/Managed Challenge.
- No dupliques hostnames entre múltiples YAML. Preferir `/<name>-tunnel.yml` por túnel.
