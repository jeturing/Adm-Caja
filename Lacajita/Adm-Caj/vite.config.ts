import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, loadEnv } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const API_PORT = env.API_PORT || "8001";
  const isProd = mode === 'production';
  
  return {
  // Unificar variables: leer .env desde la raíz del paquete frontend (una carpeta arriba)
  // Anteriormente se apuntaba a ../../ lo que hacía que Vite leyera /root/APP/.env (externo)
  // Ahora apuntamos a ../ para usar /root/APP/Lacajita/.env
  envDir: path.resolve(__dirname, ".."),
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // Export default component so imports like `import X from './icon.svg?react'` work
        exportType: "default",
      },
    }),
    // Disable Sentry plugin upload if no auth token provided (avoid warnings)
    ...(process.env.SENTRY_AUTH_TOKEN ? [
      sentryVitePlugin({
        org: "jeturing-inc",
        project: "la-cajita-tv",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      })
    ] : []),
  ],

  server: {
    // Permite apuntar el proxy al backend configurable por .env (API_PORT)
    // por defecto 8001 para compatibilidad con servicios existentes
    // Nota: Auth0 redirige al 5174 (frontend); esto no afecta.
    port: 5174, // Usar puerto disponible
    strictPort: true, // No cambiar de puerto: Auth0 redirige a 5174
    host: true,
    // Permitir hosts externos para llamadas desde el dominio proxy (producción local)
    allowedHosts: [
      'caja.segrd.com',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${API_PORT}/`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        secure: false, // Deshabilitar verificación SSL para desarrollo
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          // http-proxy event signatures: (proxyReq, req, res), (proxyRes, req, res)
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("Sending Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response:", proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },

  define: {
    // Definir variables globales para development
  __DEV__: process.env.NODE_ENV !== "production",
  __SSL_BYPASS__: true,
  // Evitar sobrescribir todo process.env (algunas dependencias lo usan).
  // Sólo exponer NODE_ENV para compatibilidad.
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },

  build: {
    sourcemap: isProd ? false : true,
    target: 'es2018',
    // Aumentar límite de advertencia y dividir manualmente los chunks para evitar bundles enormes
    chunkSizeWarningLimit: 2000,
    cssMinify: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          // Agrupar paquetes pesados en chunks separados para reducir el bundle principal
          if (id.includes('apexcharts') || id.includes('react-apexcharts')) return 'vendor_apexcharts';
          if (id.includes('@react-jvectormap') || id.includes('react-jvectormap')) return 'vendor_jvectormap';
          if (id.includes('@fullcalendar')) return 'vendor_fullcalendar';
          if (id.includes('swiper')) return 'vendor_swiper';
          if (id.includes('jquery')) return 'vendor_jquery';
          if (id.includes('@sentry')) return 'vendor_sentry';
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor_react';
          // Por defecto, agrupar por paquete raíz
          const parts = id.split('node_modules/')[1].split('/');
          return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
        },
      },
    },
  },
  };
});
