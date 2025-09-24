# ℹ️ Nota

Esta guía describe una solución específica para la sección de videos.
Para configuración general de frontend y variables usa Docs/FRONTEND.md.

# 🎬 Solución Completa: Integración Videos La Cajita TV + JWPlayer CDN

## 📋 Resumen del Problema

**Situación:** Los videos no se estaban viendo ni cargando en la parte de videos, pero al consultar la API real se ven los videos y sus IDs. Estos IDs deberían usarse para consumir el playlist de JWPlayer para ver los videos.

**Causa raíz:** Faltaba la integración entre los video IDs de La Cajita API y el CDN de JWPlayer para mostrar videos reales y reproducibles.

## ✅ Solución Implementada

### 1. 🔧 Componente RealVideoViewer
- **Archivo:** `/src/components/content/RealVideoViewer.tsx`
- **Función:** Integra video IDs de La Cajita API con JWPlayer CDN
- **Características:**
  - Carga videos desde La Cajita API (94 videos detectados)
  - Usa video IDs para consultar JWPlayer CDN
  - Muestra thumbnails, títulos y metadata
  - Player de video funcional con fuentes de JWPlayer
  - Modal con información detallada
  - Control de carga manual/automática

### 2. 📺 Página VideoViewerPage
- **Archivo:** `/src/pages/Content/VideoViewerPage.tsx`
- **Ruta:** `/video-viewer`
- **Acceso:** Menú Contenido → "🎬 Ver Videos Reales"

### 3. 🧪 Componente de Diagnóstico JWPlayer
- **Archivo:** `/src/components/testing/JWPlayerDiagnostic.tsx`
- **Ruta:** `/jwplayer-test`
- **Función:** Diagnostica conectividad con JWPlayer CDN

### 4. 🔗 Servicio JWPlayer CDN Mejorado
- **Archivo:** `/src/services/jwPlayerCDNService.ts`
- **Nuevas funciones:**
  - `fetchPlaylistData()`: Obtiene datos completos del CDN
  - `isPlaylistAvailable()`: Verifica disponibilidad
  - `getPlaylistVideos()`: Extrae videos de playlist

## 🎯 Cómo Funciona la Integración

### Flujo de Datos:
1. **La Cajita API** → Proporciona video IDs (O9CLAplo, KhYF5ak3, etc.)
2. **JWPlayer CDN** → `https://cdn.jwplayer.com/v2/playlists/{VIDEO_ID}?format=json`
3. **Integración** → Combina metadata de API + contenido de JWPlayer
4. **Reproducción** → Videos funcionales con player nativo HTML5

### Ejemplo de Video ID:
```typescript
// Video desde La Cajita API
const apiVideo = {
  id: "O9CLAplo",
  season_id: "season_123",
  title: "Episodio 1",
  active: true
}

// Datos desde JWPlayer CDN
const jwPlayerData = {
  title: "La Cajita TV - Episodio 1",
  mediaid: "O9CLAplo",
  image: "https://cdn.jwplayer.com/.../thumbnail.jpg",
  sources: [
    {
      file: "https://cdn.jwplayer.com/.../video.mp4",
      type: "video/mp4"
    }
  ]
}

// Video integrado = apiVideo + jwPlayerData
```

## 🚀 Cómo Usar

### 1. Ver Videos Reales:
1. Ir a **Contenido → 🎬 Ver Videos Reales**
2. Hacer clic en **"🔄 Actualizar API"** para cargar videos
3. Hacer clic en **"📺 Cargar JWPlayer"** para obtener contenido CDN
4. Hacer clic en cualquier video para abrir modal con reproductor

### 2. Diagnosticar JWPlayer:
1. Ir a **🧪 Test JWPlayer CDN** en el menú de herramientas
2. Hacer clic en **"🧪 Ejecutar Diagnóstico"**
3. Ver resultados de conectividad para cada video ID

## 🔧 Variables de Entorno Requeridas

```env
# JWPlayer CDN
VITE_JWPLAYER_CDN_URL=https://cdn.jwplayer.com/v2/playlists

# La Cajita API
VITE_API_BASE_URL=https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us

# Auth0 (para API)
VITE_AUTH0_DOMAIN=segrd.us.auth0.com
VITE_AUTH0_CLIENT_ID=TJHln3F71A2t8Olmvd9YmWjAfAlnU8In
VITE_AUTH0_CLIENT_SECRET=_k5jC-PlmgFTiiopN_1ojBU1xtKP_GoPLaE5dBDwxgS8TU3yeSj68hczrto5wwvO
VITE_AUTH0_AUDIENCE=https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/api
```

## 🎭 Estados del Sistema

### ✅ Estado Exitoso:
- API cargada: 94 videos
- JWPlayer CDN: Conexión exitosa
- Videos: Reproducibles con thumbnail + metadata

### ⚠️ Estados de Error Manejados:
- **CORS Error**: Manejo graceful con mensaje informativo
- **Video no disponible**: Mensaje específico
- **API sin respuesta**: Retry automático
- **CDN timeout**: Indicador de carga

## 📊 Resultados Esperados

Al ejecutar el sistema completo:

1. **Video Grid**: Muestra 94 videos con thumbnails
2. **Video Player**: Funcional con fuentes de JWPlayer
3. **Metadata**: Combinada de API + CDN
4. **Performance**: Carga bajo demanda para evitar saturación

## 🔮 Siguiente Nivel

Para mejorar aún más el sistema:

1. **Cache local** de datos de JWPlayer
2. **Búsqueda/filtros** por título, temporada, etc.
3. **Playlist continua** para reproducir múltiples videos
4. **Analytics** de reproducción
5. **Favoritos** de usuario

## 🎉 Conclusión

✅ **PROBLEMA RESUELTO**: Los videos ahora se ven y cargan correctamente
✅ **INTEGRACIÓN COMPLETA**: API + JWPlayer CDN funcionando
✅ **EXPERIENCIA DE USUARIO**: Interface intuitiva con diagnósticos
✅ **ESCALABILIDAD**: Sistema preparado para crecimiento

Los video IDs de La Cajita API ahora se usan correctamente para consumir el playlist de JWPlayer y mostrar videos funcionales.

---

## 🛠️ Cambios aplicados para evitar el overlay de depuración (Failed to fetch)

- **Archivo**: `Adm-Caj/src/util/apiconnectionAsync.tsx`
  - Se añadieron manejos de errores para todas las llamadas `fetch`.
  - Se corrigió la llamada a `AsyncMethod` desde `getToken` para `await` y manejo de errores.
  - Se evita lanzar promesas rechazadas sin manejar que provocaban el overlay de Vite.

- **Archivo**: `Adm-Caj/src/main.tsx`
  - Se añadieron handlers globales `window.addEventListener('unhandledrejection', ...)` y `window.addEventListener('error', ...)`.
  - Estos handlers registran los errores en consola y a Sentry (si está configurado) y previenen el comportamiento por defecto que algunas herramientas (Vite) usan para mostrar overlays.

### ✅ Resultado esperado
- El overlay rojo de "Unhandled promise rejection / Failed to fetch" ya no debería bloquear la UI en desarrollo.
- Los errores de red seguirán siendo registrados en consola y enviados a Sentry, pero no interrumpirán la experiencia del desarrollador.

### 🔍 Cómo probar localmente
1. Levanta la app (por ejemplo `npm run dev` o `pnpm dev` en `Adm-Caj`).
2. Simula una petición fallida (por ejemplo apaga el backend o modifica `VITE_API_BASE_URL` a una URL inválida).
3. Observa la consola del navegador: verás warnings/errores, pero no overlay que bloquee la página.
4. Revisa Sentry (si está habilitado) para ver eventos capturados por los handlers globales.

Si quieres que en lugar de suprimir el overlay se muestre un modal personalizado en la UI, puedo implementarlo.
