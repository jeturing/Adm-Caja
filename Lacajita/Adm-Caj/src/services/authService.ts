/**
 * Servicio de autenticación para La Cajita TV API
 * Prioriza login directo con La Cajita API, fallback a Auth0
 */

// Configuración para desarrollo
const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
// Permitir ambos nombres de env y desactivar flows desde el navegador por defecto
const CLIENT_SECRET =
  import.meta.env.VITE_CLIENT_SECRET ||
  (import.meta as any).env?.VITE_SECRET_KEY;
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'segrd.us.auth0.com';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
// No exponer secretos en el frontend; si está definido es solo para entornos controlados de prueba
const AUTH0_CLIENT_SECRET = import.meta.env.VITE_AUTH0_CLIENT_SECRET || '';
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/api';

// Flags para habilitar explícitamente flujos sensibles en el navegador
const ENABLE_CLIENT_CREDENTIALS = (import.meta.env.VITE_ENABLE_CLIENT_CREDENTIALS || 'false') === 'true';
const ENABLE_AUTH0_DIRECT = (import.meta.env.VITE_ENABLE_AUTH0_DIRECT || 'false') === 'true';

interface TokenResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

let currentToken: string | null = null;
let tokenExpiresAt: number | null = null;
let tokenType: 'lacajita' | 'auth0' | 'dev' = 'dev';

export class AuthService {
  /**
   * Obtiene un token - Prioriza Client Credentials que sabemos que funciona
   */
  async getToken(): Promise<string> {
    // Verificar si ya tenemos un token válido
    if (currentToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 30000) {
      console.log(`🔄 Usando token ${tokenType} existente`);
      return currentToken;
    }

    // Método principal: Client Credentials (solo si está habilitado explícitamente)
    if (ENABLE_CLIENT_CREDENTIALS) {
      try {
        const clientToken = await this.getClientCredentialsToken();
        if (clientToken) {
          return clientToken;
        }
      } catch (error) {
        console.log('⚠️ Client Credentials falló, evaluando siguiente opción...');
      }
    } else {
      console.log('⏭️ Client Credentials deshabilitado en el navegador (VITE_ENABLE_CLIENT_CREDENTIALS=false)');
    }

    // Fallback a Auth0 directo (solo si está habilitado explícitamente)
    if (ENABLE_AUTH0_DIRECT) {
      try {
        const auth0Token = await this.getAuth0Token();
        if (auth0Token) {
          return auth0Token;
        }
      } catch (error) {
        console.log('⚠️ Auth0 directo falló, usando modo desarrollo...');
      }
    } else {
      console.log('⏭️ Auth0 directo deshabilitado en el navegador (VITE_ENABLE_AUTH0_DIRECT=false)');
    }

    // Último fallback: modo desarrollo
    return this.getDevToken();
  }

  /**
   * Obtiene token usando Client Credentials con La Cajita API (MÉTODO PRINCIPAL)
   */
  private async getClientCredentialsToken(): Promise<string | null> {
    try {
      console.log('🔑 Intentando Client Credentials con La Cajita API...');
      
      const baseUrl = import.meta.env.DEV ? '/api' : API_BASE_URL;
      
      const response = await fetch(`${baseUrl}/auth/client-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_secret: CLIENT_SECRET
        })
      });

      console.log(`📡 /auth/client-credentials: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data: TokenResponse = await response.json();
        
        if (data.access_token) {
          currentToken = data.access_token;
          tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
          tokenType = 'lacajita';
          
          console.log('✅ Token de Client Credentials obtenido exitosamente');
          console.log('📅 Token expira en:', new Date(tokenExpiresAt).toLocaleString());
          console.log('🔑 Token preview:', data.access_token.substring(0, 50) + '...');
          
          return data.access_token;
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Client Credentials error:`, response.status, errorText);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error en getClientCredentialsToken:', error);
      return null;
    }
  }

  /**
   * Obtiene token desde Auth0 (fallback)
   */
  private async getAuth0Token(): Promise<string | null> {
    try {
      console.log('🔑 Intentando Auth0 client credentials...');
      
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Auth0 error:', response.status, errorText);
        return null;
      }

      const data: TokenResponse = await response.json();
      
      if (data.access_token) {
        currentToken = data.access_token;
        tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
        tokenType = 'auth0';
        
        console.log('✅ Token Auth0 obtenido como fallback');
        console.log('📅 Token expira en:', new Date(tokenExpiresAt).toLocaleString());
        
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error('❌ Error en getAuth0Token:', error);
      return null;
    }
  }

  /**
   * Token de desarrollo (último fallback)
   */
  private getDevToken(): string {
    console.log('🔧 Usando token de desarrollo como último fallback');
    
    const devToken = btoa(`dev-fallback:${CLIENT_SECRET}:${Date.now()}`);
    currentToken = devToken;
    tokenExpiresAt = Date.now() + (3600 * 1000); // 1 hora
    tokenType = 'dev';
    
    return devToken;
  }

  /**
   * Obtiene headers de autenticación para requests a la API
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (tokenType === 'lacajita' || tokenType === 'auth0') {
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${token}`
      };
    } else {
      // Modo desarrollo - Probar API sin autenticación
      console.log('🔧 Modo desarrollo: Headers mínimos (API pública)');
      return baseHeaders;
    }
  }

  /**
   * Obtiene headers para API pública (sin autenticación)
   */
  getPublicHeaders(): Record<string, string> {
    console.log('🌐 Usando headers públicos (sin autenticación)');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'LaCajita-Dashboard/1.0',
      'Cache-Control': 'no-cache'
    };
  }

  /**
   * Limpia el token actual (fuerza refresh en próxima petición)
   */
  clearToken(): void {
    console.log('🧹 Limpiando token almacenado');
    currentToken = null;
    tokenExpiresAt = null;
    tokenType = 'dev';
  }

  /**
   * Fuerza refresh del token
   */
  async refreshToken(): Promise<string> {
    this.clearToken();
    return await this.getToken();
  }

  /**
   * Obtiene información del token actual
   */
  getTokenInfo(): { token: string | null; type: string; expiresAt: number | null } {
    return {
      token: currentToken,
      type: tokenType,
      expiresAt: tokenExpiresAt
    };
  }

  /**
   * Obtiene información del usuario desde Auth0 o desde el contexto actual
   */
  async getUserInfo(): Promise<any> {
    try {
      // Si tenemos auth0, usar esos datos del contexto
      const auth0 = (window as any).auth0User;
      if (auth0) {
        console.log('👤 Usando datos de usuario de Auth0:', auth0);
        return {
          sub: auth0.sub,
          email: auth0.email,
          name: auth0.name || auth0.email,
          email_verified: auth0.email_verified,
          picture: auth0.picture,
          source: 'auth0'
        };
      }

      // Si tenemos token de La Cajita API, intentar obtener usuario
      if (tokenType === 'lacajita' && currentToken) {
        try {
          const baseUrl = import.meta.env.DEV ? '/api' : API_BASE_URL;
          const response = await fetch(`${baseUrl}/user/me`, {
            headers: await this.getAuthHeaders()
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('👤 Datos de usuario desde La Cajita API:', userData);
            return { ...userData, source: 'lacajita' };
          }
        } catch (error) {
          console.log('⚠️ No se pudo obtener usuario desde La Cajita API:', error);
        }
      }

      // Fallback: información básica
      return {
        sub: 'anonymous',
        email: 'usuario@desarrollo.com',
        name: 'Usuario de Desarrollo',
        source: 'fallback',
        token_type: tokenType
      };

    } catch (error) {
      console.error('❌ Error obteniendo información de usuario:', error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio de autenticación está funcionando
   */
  async checkHealth(): Promise<{ lacajita: boolean; auth0: boolean }> {
    const results = { lacajita: false, auth0: false };

    // Check La Cajita API
    try {
      const baseUrl = import.meta.env.DEV ? '/api' : API_BASE_URL;
      const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
      results.lacajita = response.ok;
    } catch (error) {
      console.warn('La Cajita API no disponible:', error);
    }

    // Check Auth0
    try {
      const response = await fetch(`https://${AUTH0_DOMAIN}/.well-known/openid_configuration`);
      results.auth0 = response.ok;
    } catch (error) {
      console.warn('Auth0 no disponible:', error);
    }

    return results;
  }
}

// Instancia singleton
export const authService = new AuthService();
