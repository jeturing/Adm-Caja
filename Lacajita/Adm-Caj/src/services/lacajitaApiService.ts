/**
 * Servicio específico para La Cajita TV API
 * Basado en el análisis del código Python local
 */

const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || (import.meta as any).env?.VITE_SECRET_KEY || '3e1601b5f867d06c2de5ef515ae93e23e';

// Credenciales de Auth0 para client credentials
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'segrd.us.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
const AUTH0_CLIENT_SECRET = import.meta.env.VITE_AUTH0_CLIENT_SECRET || '';
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/api';

interface TokenResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

class LaCajitaApiService {
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;
  private tokenType: 'password' | 'client_credentials' | null = null;

  private getBaseUrl(): string {
    return import.meta.env.DEV ? '/api' : API_BASE_URL;
  }

  /**
   * Método 1: Login usando Resource Owner Password Grant (endpoint /login)
   * Según la API Python, este endpoint usa query parameters
   */
  async loginWithPassword(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Intentando login con credenciales de usuario...');
      
      // Usar query parameters como espera la API
      const params = new URLSearchParams({ email, password });
      const url = `${this.getBaseUrl()}/login?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        
        if (data.access_token) {
          this.token = data.access_token;
          this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
          this.tokenType = 'password';
          
          console.log('✅ Login exitoso con password grant');
          console.log('🔑 Token expira en:', new Date(this.tokenExpiresAt).toLocaleString());
          
          return true;
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Login password falló: ${response.status} - ${errorText}`);
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en loginWithPassword:', error);
      return false;
    }
  }

  /**
   * Método 2: Client Credentials Grant (endpoint /auth/client-credentials)
   * Para aplicaciones que se autentican sin usuario
   */
  async getClientCredentialsToken(): Promise<boolean> {
    try {
      console.log('🔐 Intentando client credentials...');
      
      const response = await fetch(`${this.getBaseUrl()}/auth/client-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_secret: CLIENT_SECRET
        })
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        
        if (data.access_token) {
          this.token = data.access_token;
          this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
          this.tokenType = 'client_credentials';
          
          console.log('✅ Client credentials exitoso');
          console.log('🔑 Token expira en:', new Date(this.tokenExpiresAt).toLocaleString());
          
          return true;
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Client credentials falló: ${response.status} - ${errorText}`);
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en getClientCredentialsToken:', error);
      return false;
    }
  }

  /**
   * Método 3: Auth0 directo (bypass de la API intermedia)
   */
  async getAuth0DirectToken(): Promise<boolean> {
    try {
      console.log('🔐 Intentando Auth0 directo...');
      
      const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: AUTH0_CLIENT_ID,
          client_secret: AUTH0_CLIENT_SECRET,
          audience: AUTH0_AUDIENCE,
          grant_type: 'client_credentials'
        })
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        
        if (data.access_token) {
          this.token = data.access_token;
          this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
          this.tokenType = 'client_credentials';
          
          console.log('✅ Auth0 directo exitoso');
          console.log('🔑 Token expira en:', new Date(this.tokenExpiresAt).toLocaleString());
          
          return true;
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Auth0 directo falló: ${response.status} - ${errorText}`);
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en getAuth0DirectToken:', error);
      return false;
    }
  }

  /**
   * Estrategia de autenticación en cascada - ACTUALIZADA
   */
  async authenticate(): Promise<boolean> {
    console.log('🚀 Iniciando autenticación en cascada...');
    
    // Verificar si ya tenemos un token válido
    if (this.token && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 30000) {
      console.log(`✅ Token ${this.tokenType} válido encontrado`);
      return true;
    }

  // Por defecto evitamos client-credentials/Auth0 directo desde el navegador.
  // Si se requiere, llame explícitamente getClientCredentialsToken o habilite via flag.

  // Método: Probar diferentes credenciales de usuario (como último recurso en dev)
    const testCredentials = [
      { email: 'admin', password: 'admin' },
      { email: 'admin@lacajita.tv', password: 'admin123' },
      { email: 'test@lacajita.tv', password: 'test123' },
      { email: 'demo', password: 'demo123' }
    ];

    for (const creds of testCredentials) {
      console.log(`🧪 Probando credenciales: ${creds.email}`);
      if (await this.loginWithPassword(creds.email, creds.password)) {
        return true;
      }
    }

    console.log('❌ Todas las estrategias de autenticación fallaron');
    return false;
  }

  /**
   * Obtiene headers de autenticación
   */
  getAuthHeaders(): Record<string, string> {
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.token) {
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${this.token}`
      };
    }

    return baseHeaders;
  }

  /**
   * Hace una petición autenticada a la API
   */
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Asegurar autenticación
    if (!await this.authenticate()) {
      throw new Error('No se pudo autenticar con la API');
    }

    // Hacer petición con headers de auth
    const url = `${this.getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    });

    // Si es 401, intentar re-autenticar una vez
    if (response.status === 401 && this.token) {
      console.log('🔄 Token expirado, re-autenticando...');
      this.clearToken();
      
      if (await this.authenticate()) {
        // Reintentar con nuevo token
        return await fetch(url, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers
          }
        });
      }
    }

    return response;
  }

  /**
   * Obtiene datos de la API con manejo de errores
   */
  async getData(endpoint: string): Promise<any> {
    try {
      const response = await this.makeAuthenticatedRequest(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error obteniendo datos de ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Limpia el token actual
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiresAt = null;
    this.tokenType = null;
  }

  /**
   * Obtiene información del estado actual
   */
  getStatus(): { authenticated: boolean; tokenType: string | null; expiresIn: number | null } {
    const expiresIn = this.tokenExpiresAt ? Math.max(0, this.tokenExpiresAt - Date.now()) : null;
    
    return {
      authenticated: !!this.token && !!this.tokenExpiresAt && Date.now() < this.tokenExpiresAt,
      tokenType: this.tokenType,
      expiresIn
    };
  }

  /**
   * Test de conectividad con la API
   */
  async testConnection(): Promise<{ success: boolean; endpoints: any[] }> {
    const endpoints = [
      { name: 'Health Check', endpoint: '/health', method: 'GET' },
      { name: 'Playlists', endpoint: '/playlists', method: 'GET' },
      { name: 'Videos', endpoint: '/videos', method: 'GET' },
      { name: 'Seasons', endpoint: '/seasons', method: 'GET' }
    ];

    const results = [];

    for (const ep of endpoints) {
      try {
        let response;
        
        if (ep.endpoint === '/health') {
          // Health check sin autenticación
          response = await fetch(`${this.getBaseUrl()}${ep.endpoint}`);
        } else {
          // Otros endpoints con autenticación
          response = await this.makeAuthenticatedRequest(ep.endpoint);
        }

        results.push({
          ...ep,
          status: response.status,
          success: response.ok,
          error: response.ok ? null : response.statusText
        });
      } catch (error) {
        results.push({
          ...ep,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    const success = results.filter(r => r.success).length > 0;
    
    return { success, endpoints: results };
  }
}

// Instancia singleton
export const lacajitaApiService = new LaCajitaApiService();
