import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
// import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { Auth0ProviderWithNavigate } from "./context/Auth0ProviderWithNavigate";

// Initialize Sentry
Sentry.init({
  dsn: "https://072105b90aaaa842c3f7040c36a47d49@o4508162202009600.ingest.us.sentry.io/4509676931514368",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

// Debug logs
console.log('🚀 Iniciando aplicación...');
console.log('📍 Entorno:', import.meta.env.MODE);

// Evitar que promesas rechazadas sin manejar muestren el overlay de Vite en desarrollo.
// Registramos handlers globales que loguean los errores y evitan la excepción no manejada.
window.addEventListener('unhandledrejection', (event) => {
  try {
    // Reportar a Sentry si está configurado
    if (Sentry && Sentry.captureException && event.reason) {
      Sentry.captureException(event.reason);
    }
  } catch (e) {
    // noop
  }
  // Prevenir el comportamiento por defecto que algunas herramientas interpretan como overlay
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  // Log a consola para depuración
  // eslint-disable-next-line no-console
  console.warn('Unhandled promise rejection captured (suppressed overlay):', event.reason);
});

window.addEventListener('error', (event) => {
  try {
    if (Sentry && Sentry.captureException && event.error) {
      Sentry.captureException(event.error);
    }
  } catch (e) {
    // noop
  }
  // eslint-disable-next-line no-console
  console.error('Global error captured:', event.error || event.message);
});

// Validar variables de entorno
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID'
];

let missingVars = false;
requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${varName}`);
    missingVars = true;
  }
});

if (missingVars) {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; background-color: #fff3f3; border: 1px solid #ffcccc; border-radius: 8px;">
        <h1 style="color: #d9534f;">Error de Configuración</h1>
        <p>Faltan variables de entorno críticas. Revisa la consola del navegador para más detalles.</p>
        <p>Asegúrate de que tu archivo <code>.env.local</code> existe y contiene todas las variables requeridas.</p>
      </div>
    `;
  }
} else {
  console.log('🔧 Variables de entorno:', {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  });

  const rootElement = document.getElementById("root");
  if (rootElement) {
    console.log('✅ Elemento root encontrado, creando aplicación...');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <Router>
          <Auth0ProviderWithNavigate>
            <App />
          </Auth0ProviderWithNavigate>
        </Router>
      </React.StrictMode>
    );
    console.log('✅ Aplicación renderizada exitosamente');
  } else {
    console.error('❌ No se encontró el elemento root. La aplicación no puede iniciar.');
  }
}
