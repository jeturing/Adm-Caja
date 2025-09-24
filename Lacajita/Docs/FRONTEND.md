## Frontend (SPA) – React + Vite

Stack
- React + Vite, Tailwind.
- Ubicación del proyecto: `Adm-Caj/`.
- Servidor dev: http://localhost:5174

### Variables de entorno (solo VITE_)
- VITE_API_BASE_URL: base del backend FastAPI (ej: http://127.0.0.1:8001)
- VITE_AUTH0_DOMAIN: dominio Auth0 (ej: segrd.us.auth0.com)
- VITE_AUTH0_CLIENT_ID: Client ID de la SPA en Auth0
- VITE_AUTH0_REDIRECT_URI: redirect URI de Auth0 para login (ej: http://127.0.0.1:5174)
- Flags (por defecto false):
  - VITE_ENABLE_CLIENT_CREDENTIALS: no usar desde frontend
  - VITE_ENABLE_AUTH0_DIRECT: no usar flujos M2M directos desde navegador

Notas
- Nunca colocar secretos en variables VITE_ (quedan expuestas en el bundle).
- La SPA debe autenticarse con Auth0 usando el flujo OIDC de navegador y pedir tokens para la audience del backend cuando corresponda.

### Integración con Auth0
La app utiliza el SDK de Auth0 para navegador. Requisitos:
1) Configurar la aplicación SPA en Auth0 con redirect/logout URIs válidas.
2) Usar VITE_AUTH0_CLIENT_ID de la SPA (no el de M2M).
3) Solicitar tokens con audience del backend si se llamarán endpoints protegidos.

Ejemplo de `Auth0Provider` usado en este repo (implementado en `src/context/Auth0ProviderWithNavigate.tsx`):

```tsx
import { Auth0Provider } from '@auth0/auth0-react';
import { ENV } from '../config/env';

const domain = ENV.AUTH0_DOMAIN;
const clientId = ENV.AUTH0_CLIENT_ID;
const audience = ENV.AUTH0_AUDIENCE; // opcional
const redirectUri = ENV.AUTH0_REDIRECT_URI || window.location.origin;

<Auth0Provider
  domain={domain}
  clientId={clientId}
  authorizationParams={{
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    ...(audience ? { audience } : {})
  }}
  cacheLocation="localstorage"
  useRefreshTokens={true}
>
  <App />
</Auth0Provider>
```

Notas:
- `audience` solo debe configurarse si quieres obtener Access Tokens destinados a tu backend (AUTH0_API_AUDIENCE).
- No incluir client secrets ni credenciales M2M en `ENV` o `import.meta.env`.

Verificación rápida
- Asegúrate de añadir `VITE_AUTH0_AUDIENCE` en `.env` si tu backend valida audience.
- Al iniciar, realiza login y comprueba en la consola de devtools que el access token contiene el `aud` correcto (la audience del backend).


### Comunicación con el backend
- Preferir leer la configuración segura desde GET `${VITE_API_BASE_URL}/config/public` al arrancar para hidratar el cliente (base URL, flags VITE_*).
- Enviar el access token en Authorization: Bearer <token> para endpoints protegidos.
- No invocar /auth/client-credentials desde el navegador (está deshabilitado por bandera y por diseño).

Túneles y WAF (navegación en producción)
- Si el frontend consume una API detrás de Cloudflare Tunnel, verifica que el subdominio de la API no esté bajo challenge del WAF. Si ves 403 cf-mitigated, solicita una excepción “Skip” de Bot Fight/Managed Challenge para el host o la ruta.

### Desarrollo
- Instalar dependencias en `Adm-Caj/` y ejecutar `npm run dev`.
- El backend debe estar activo en 8001.

### Construcción y revisión
- `npm run build` genera `Adm-Caj/dist`.
- Revisión rápida: buscar que no existan secretos (buscar por AUTH0_MGMT_CLIENT_SECRET, etc.)

### Problemas comunes
- “Unknown client”: revisa que VITE_AUTH0_CLIENT_ID sea el de SPA correcto.
- 401 del backend: el token no tiene audience AUTH0_API_AUDIENCE; solicitarlo correctamente.
- CORS: ajustar CORS_ORIGINS en el backend.
