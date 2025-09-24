## La Cajita – Dashboard + API

Este monorepo contiene:
- Backend FastAPI con Auth0 (RS256) para autenticación y Auth0 Management API para operaciones administrativas.
- Frontend SPA (React + Vite) que consume la API. No se exponen secretos en el navegador.

Documentación unificada
- API: Docs/API.md
- Frontend: Docs/FRONTEND.md
 - Cloudflare/Túneles + TLS: (arriba)

### Requisitos
- Node.js 18+ (recomendado 20+)
- Python 3.10+

### Configuración
Archivo `.env` en la raíz con separación clara:
- Backend (sin prefijo VITE_): AUTH0_DOMAIN, AUTH0_API_AUDIENCE, AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET, SECRET_KEY, DB_*, CORS_*, etc.
- Frontend (solo prefijo VITE_): VITE_API_BASE_URL, VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_REDIRECT_URI y banderas VITE_ENABLE_*

Nunca coloques secretos de servidor bajo VITE_.

### Cómo ejecutar
Backend
- python3 lacajitaapi.py (o Api.py)
- Verifica GET http://127.0.0.1:8001/health

Frontend
- cd Adm-Caj
- npm install
- npm run dev (http://localhost:5174)

### Túneles Cloudflare + HTTPS
- Cloudflare Tunnel expone subdominios hacia servicios locales (ej.: FastAPI en 8000/8001).
- Si ves error 1033, verifica que el CNAME del subdominio apunte a <TUNNEL_ID>.cfargotunnel.com en la zona correcta.
- Si ves 403 con cf-mitigated: challenge, crea una regla WAF “Skip” para el hostname (y opcionalmente la ruta) para omitir Bot Fight/Managed Challenge.
- Evita duplicar configuraciones: usa un YAML por túnel (ej. `/etc/cloudflared/<name>-tunnel.yml`). No mezcles el mismo hostname en `config.yml`.

TLS en el origen (opcional)
- Para origen HTTPS real, usa Nginx en localhost:8443 con certificados de Certbot (DNS-01 Cloudflare) y configura cloudflared con `service: https://localhost:8443` y `originServerName`.

### Seguridad
- Tokens: el backend valida JWT RS256 de Auth0 con audience AUTH0_API_AUDIENCE.
- M2M: solo backend usa client credentials (Auth0 Management API). Protege /auth/client-credentials con SECRET_KEY y úsalo únicamente desde servidor.

### Endpoints de dashboard (API)
- GET /dashboard/customers-summary: totales/activos/nuevos/flags (fuente Auth0 Management API; con caché corto).
- GET /dashboard/customers-demographic: distribuciones demográficas (
	email_verified/banned, dominios, países si están disponibles; fuente Auth0; con caché).

### Endpoints clave
- GET /health – vida del servicio
- GET /config/public – configuración segura para el cliente (VITE_*)
- GET /user/me – claims del usuario autenticado
- POST /auth0/users – crear usuario en Auth0 (Management)
- POST /auth/client-credentials – token M2M (solo backend)

Más detalles en Docs/API.md

### Notas de despliegue
- Usa una sola app de backend (Api.py o lacajitaapi.py) en producción para evitar duplicidad.
- Ajusta CORS_ORIGINS para el dominio del frontend.
- No expongas logs ni archivos sensibles.
 - Cloudflare: CNAME del subdominio a `<TUNNEL_ID>.cfargotunnel.com` en la zona correcta; si se usa WAF estricto, agrega regla de excepción para tu host.
