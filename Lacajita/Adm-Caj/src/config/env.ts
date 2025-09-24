// Configuración de variables de entorno para Auth0 y API
export const ENV = {
  // Auth0 Configuration (SPA)
  AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN || 'segrd.us.auth0.com',
  AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  // Audience (API Identifier) used when requesting access tokens for the backend API
  AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE || '',
  AUTH0_REDIRECT_URI: import.meta.env.VITE_AUTH0_REDIRECT_URI || 'http://127.0.0.1:5174',
  
  // NOTE: Machine-to-Machine credentials must NOT be present in the browser.
  // Keep these empty in frontend builds to avoid accidental exposure.
  AUTH0_M2M_CLIENT_ID: '',
  AUTH0_M2M_CLIENT_SECRET: '',
  
  // API Configuration  
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us',
  CLIENT_SECRET: import.meta.env.VITE_CLIENT_SECRET || '',
  
  // Development flags
  DEV_MODE: import.meta.env.DEV || false,
  
  // Validation functions
  isValid(): boolean {
    // Client secrets must not be required in browser builds.
    // Only require values necessary for SPA operation.
    return !!(
  this.AUTH0_DOMAIN &&
  this.AUTH0_CLIENT_ID &&
  this.API_BASE_URL
    );
  },
  
  getAuthConfig() {
    return {
  domain: this.AUTH0_DOMAIN,
  clientId: this.AUTH0_CLIENT_ID,
  audience: this.AUTH0_AUDIENCE,
  redirectUri: this.AUTH0_REDIRECT_URI,
  apiBaseUrl: this.API_BASE_URL
    };
  }
};

// Verificar configuración al cargar
if (ENV.DEV_MODE && !ENV.isValid()) {
  console.warn('⚠️ Configuración de Auth0 incompleta. Verifica las variables de entorno.');
}
