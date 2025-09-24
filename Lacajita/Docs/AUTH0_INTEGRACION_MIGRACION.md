# Guía de Migración e Implementación de Auth0 (SPA + Backend)

Este documento explica, con todo detalle, cómo implementar la autenticación con Auth0 en otro proyecto basado en este mismo template. Está pensado para que otra IA o desarrollador replique la integración exactamente como aquí: qué archivos copiar, qué variables `.env` definir, qué endpoints debe exponer el backend y cómo probarlo.

Si sigues estos pasos en orden, tendrás el login con Auth0 funcionando (Authorization Code Flow con PKCE) y un proxy seguro para la Management API desde el backend.

## Resumen Arquitectura
- Frontend (Vite + React): usa `@auth0/auth0-react` y envuelve la app con un Provider que lee `ENV` desde `src/config/env.ts`.
- Backend (FastAPI u otro): valida JWT RS256 emitidos por Auth0 con `issuer=https://<AUTH0_DOMAIN>/` y `audience=AUTH0_API_AUDIENCE`. Expone endpoints `/auth0/*` que proxyfían a la Auth0 Management API usando Client Credentials (servidor-Servidor).
- Vite Proxy en dev: todas las llamadas a `/api/*` se redirigen al backend local.

## Archivos a Copiar (Frontend)
Copia estos archivos y carpetas al proyecto destino, respetando las rutas:

- `src/config/env.ts`
- `src/context/Auth0ProviderWithNavigate.tsx`
- `src/context/Auth0Provider.tsx` (opcional; versión sin audience)
- `src/context/AuthContext.tsx`
- `src/hooks/useAuth0Integration.ts`
- `src/hooks/usePermissions.ts`
- `src/services/auth0ManagementService.ts`
- `src/types/permissions.ts`
- `src/components/auth/Auth0Components.tsx`
- (Opcional de prueba y diagnóstico) `src/pages/Auth0Test.tsx`, `src/pages/Auth0Debug.tsx`, `src/components/testing/Auth0TestComponent.tsx`, `src/components/testing/Auth0TokenTester.tsx`, `src/components/Auth0LoginTest.tsx`, `src/components/Auth0Debug.tsx`

En el punto de entrada de tu app (p. ej. `src/main.tsx`), envuelve `<App />` así:

```tsx
import { Auth0ProviderWithNavigate } from "./context/Auth0ProviderWithNavigate";

// ...
<Router>
  <Auth0ProviderWithNavigate>
    <App />
  </Auth0ProviderWithNavigate>
  {/* Asegúrate de tener ruta /callback en tu router o una ruta catch que reenvíe */}
</Router>
```

## Variables de Entorno (Frontend)
Crea un archivo `.env.local` para el proyecto SPA con las variables exactas (ajusta los valores a tu tenant):

```env
# === Auth0 (SPA) ===
VITE_AUTH0_DOMAIN=tu-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Recomendado si el backend valida audience (debe coincidir con el Identifier de tu API en Auth0)
VITE_AUTH0_AUDIENCE=https://tu-api-identifier

# Donde corre el frontend en desarrollo
VITE_AUTH0_REDIRECT_URI=http://127.0.0.1:5174

# === API Backend ===
# Usado por servicios del frontend; en dev el proxy Vite redirige /api a este backend
VITE_API_BASE_URL=http://127.0.0.1:8001

# (Opcional) Otras variables de tu app
# VITE_CLIENT_SECRET=
```

Notas:
- El Provider calcula `redirectUri` como `<origin>/callback`. En Auth0, registra ambas URLs en Allowed Callback: `http://127.0.0.1:5174/callback` y `http://localhost:5174/callback`.
- Si usas túneles/hosting distintos, actualiza `VITE_AUTH0_REDIRECT_URI` y Allowed URLs en Auth0.

## Variables de Entorno (Backend)
El backend debe tener un `.env` con las credenciales del tenant. No expongas estos valores al frontend.

```env
# === Auth0 (Backend) ===
AUTH0_DOMAIN=tu-tenant.us.auth0.com
AUTH0_API_AUDIENCE=https://tu-api-identifier

# App M2M que tiene permisos sobre Auth0 Management API
AUTH0_MGMT_CLIENT_ID=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
AUTH0_MGMT_CLIENT_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

# (Opcional) App para ROPG si la habilitas explícitamente en Auth0
# AUTH0_ROPG_CLIENT_ID=
# AUTH0_ROPG_CLIENT_SECRET=
```

## Configuración Vite (Dev Proxy)
Asegura un proxy similar al siguiente para que el SPA hable con el backend usando `/api/*`:

```ts
// vite.config.ts
server: {
  port: 5174,
  host: true,
  proxy: {
    "/api": {
      target: "http://127.0.0.1:8001/",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
      secure: false,
    },
  },
},
```

## Endpoints que el Frontend espera en el Backend
El servicio `src/services/auth0ManagementService.ts` llama a endpoints backend prefijados con `/api/auth0` (por el proxy de Vite se convierte en `/auth0` en el backend). Implementa en el backend:

- `GET /auth0/users`
- `GET /auth0/users/:id`
- `GET /auth0/users/:id/roles`
- `POST /auth0/users/:id/roles`
- `DELETE /auth0/users/:id/roles`
- `PATCH /auth0/users/:id` (actualizar metadata y campos permitidos)
- `DELETE /auth0/users/:id`
- `POST /auth0/users` (crear usuario)
- `GET /auth0/roles`
- `GET /auth0/roles/:id`
- `PATCH /auth0/roles/:id`
- `DELETE /auth0/roles/:id`
- `GET /auth0/roles/:id/permissions`
- `POST /auth0/roles/:id/permissions`
- `DELETE /auth0/roles/:id/permissions`
- `GET /auth0/resource-servers`
- `POST /auth0/jobs/verification-email`
- `GET /auth0/logs` (o `/auth0/logs?user_id=...`)

Y adicionalmente, para el propio usuario autenticado por el SPA:

- `GET /user/me` — devuelve datos básicos del usuario desde las claims del JWT verificado (email, name, sub, etc.).

Todos estos endpoints deben usar un token de Client Credentials obtenido desde `https://{AUTH0_DOMAIN}/oauth/token` con audiencia `https://{AUTH0_DOMAIN}/api/v2/` (para Management API) o la que corresponda, y firmados con `AUTH0_MGMT_CLIENT_ID/SECRET`. Nunca solicites este token desde el navegador.

## Validación JWT (Backend)
- Descarga y cachea JWKS desde `https://{AUTH0_DOMAIN}/.well-known/jwks.json`.
- Verifica tokens RS256 con:
  - `issuer = https://{AUTH0_DOMAIN}/`
  - `audience = AUTH0_API_AUDIENCE`
- Rechaza tokens inválidos o sin scope/claims mínimas según tu política.

## Instrucciones para Otra IA (Tareas Atómicas)
1) Instalar dependencias SPA:
   - Ejecuta: `npm i @auth0/auth0-react react-router-dom`
2) Copiar archivos listados en “Archivos a Copiar (Frontend)” a rutas idénticas.
3) En `src/main.tsx` envolver `<App />` con `<Auth0ProviderWithNavigate>`.
4) Asegurar una ruta `/callback` en el Router (o usar una ruta catch-all que reenvíe a `/dashboard`).
5) Crear `.env.local` con las variables “Frontend” de este documento.
6) Revisar `vite.config.ts` e incluir el proxy `/api` como aquí.
7) En el backend:
   - Añadir `.env` con variables “Backend”.
   - Implementar verificación JWT RS256 con `issuer` y `audience` indicados.
   - Implementar endpoints `/auth0/*` de la lista, usando Client Credentials para Management API.
   - Añadir `GET /user/me` que retorna claims básicas del token.
8) Configurar la app SPA en Auth0:
   - Allowed Callback URLs: `http://127.0.0.1:5174/callback`, `http://localhost:5174/callback`.
   - Allowed Logout URLs: `http://127.0.0.1:5174`, `http://localhost:5174`.
   - Allowed Web Origins: `http://127.0.0.1:5174`, `http://localhost:5174`.
9) Probar flujo:
   - Iniciar backend en `:8001`.
   - Iniciar frontend en `:5174`.
   - Abrir `/auth0-flow` o usar `<Auth0LoginButton />` para login.
   - Verificar `/api/user/me` y llamadas a `/api/auth0/*` desde la UI de prueba.

## Ejemplo Rápido de Router (SPA)
```tsx
// Ejemplo de añadir la ruta /callback
<Routes>
  <Route path="/callback" element={<div>Procesando login...</div>} />
  <Route path="/dashboard" element={<Dashboard />} />
  {/* ...otras rutas */}
</Routes>
```

## Errores Comunes y Soluciones
- `invalid_redirect_uri`: asegura que la URL exacta (incluyendo `/callback`) está en Allowed Callback URLs en Auth0.
- `login_required` o sesión perdida al refrescar: habilita `cacheLocation="localstorage"` y `useRefreshTokens` en el Provider (ya incluido).
- `audience mismatch`: el backend y el SPA deben usar la misma `AUTH0_API_AUDIENCE`/`VITE_AUTH0_AUDIENCE` que el Identifier de la API registrada en Auth0.
- `CORS` en Management API: todas las llamadas Management deben salir desde el backend, nunca desde el navegador.

## Referencias Internas (en este repo)
- Provider: `src/context/Auth0ProviderWithNavigate.tsx`
- Config: `src/config/env.ts`
- Estado app: `src/context/AuthContext.tsx`
- Hook integración: `src/hooks/useAuth0Integration.ts`
- Roles/Permisos: `src/hooks/usePermissions.ts`, `src/types/permissions.ts`
- Servicio Management: `src/services/auth0ManagementService.ts`
- Vite Proxy: `vite.config.ts`
- Backend (ejemplo completo): `Api.py`

## Comandos Útiles
```bash
# Instalar dependencias frontend
npm install
npm install @auth0/auth0-react react-router-dom

# Levantar backend (ajústalo a tu servidor)
# uvicorn Api:app --reload --port 8001

# Levantar frontend (Vite)
npm run dev
```

---

Con esto, otra IA o desarrollador tiene todo lo necesario para implementar Auth0 como en este proyecto, incluyendo los `.env` y endpoints requeridos. Mantén sincronizados dominio, audience y callbacks entre Auth0, backend y SPA.
## Documentación del Backend (FastAPI)  