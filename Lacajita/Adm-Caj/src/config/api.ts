import { ENV } from './env';

// Configuración de la API
export const API_CONFIG = {
  BASE_URL: import.meta.env.DEV ? '/api' : ENV.API_BASE_URL,
  ENDPOINTS: {
    // Autenticación
    AUTH: {
      CLIENT_CREDENTIALS: '/auth/client-credentials',
      LOGIN: '/login',
      USER_ME: '/user/me',
    },
    // Home Carousel
    HOME_CAROUSEL: '/home-carousel',
    
    // Segmentos
    SEGMENTS: '/segments',
    
    // Playlists
    PLAYLISTS: '/playlists',
    
    // Seasons
    SEASONS: '/seasons',
    
    // Videos
    VIDEOS: '/videos',
    
    // Health Check
    HEALTH: '/health',
    
    // Documentación
    DOCS: '/docs',
    OPENAPI: '/openapi.json',
  }
};

// Headers por defecto
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Función helper para construir URLs completas
export const buildApiUrl = (endpoint: string) => {
  // Si el endpoint ya empieza con http, no modificarlo
  if (endpoint.startsWith('http')) return endpoint;
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
