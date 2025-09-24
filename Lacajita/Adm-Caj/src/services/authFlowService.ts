/**
 * Servicio de flujo de autenticación integrado
 * Gestiona el flujo completo: Auth0 → Token API → Acceso a recursos
 */

import { authService } from './authService';

interface AuthFlowState {
  isAuth0Authenticated: boolean;
  hasApiToken: boolean;
  apiTokenValid: boolean;
  userInfo: any;
  lastTokenRefresh: number;
}

class AuthFlowService {
  private state: AuthFlowState = {
    isAuth0Authenticated: false,
    hasApiToken: false,
    apiTokenValid: false,
    userInfo: null,
    lastTokenRefresh: 0
  };

  private subscribers: Array<(state: AuthFlowState) => void> = [];

  /**
   * Inicia el flujo de autenticación después del login de Auth0
   */
  async initializeAfterAuth0Login(auth0User: any): Promise<void> {
    console.log('🚀 Iniciando flujo de autenticación post-Auth0...', auth0User);
    
    try {
      // 1. Marcar Auth0 como autenticado
      this.state.isAuth0Authenticated = true;
      this.state.userInfo = auth0User;
      
      // 2. Obtener token de la API
      console.log('🔑 Solicitando token de API...');
      const apiToken = await authService.getToken();
      
      if (apiToken) {
        this.state.hasApiToken = true;
        this.state.apiTokenValid = true;
        this.state.lastTokenRefresh = Date.now();
        
        console.log('✅ Token de API obtenido exitosamente');
        console.log('🔑 Token tipo:', authService.getTokenInfo().type);
        
        // 3. Validar que el token funciona
        await this.validateApiAccess();
        
      } else {
        console.error('❌ No se pudo obtener token de API');
        this.state.hasApiToken = false;
        this.state.apiTokenValid = false;
      }
      
      // 4. Notificar a suscriptores
      this.notifySubscribers();
      
    } catch (error) {
      console.error('❌ Error en flujo de autenticación:', error);
      this.state.hasApiToken = false;
      this.state.apiTokenValid = false;
      this.notifySubscribers();
    }
  }

  /**
   * Valida que el token de API funcione
   */
  private async validateApiAccess(): Promise<boolean> {
    try {
      console.log('🔍 Validando acceso a la API...');
      
  const baseUrl = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
      const headers = await authService.getAuthHeaders();
      
      // Probar endpoint de health
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        console.log('✅ API accessible con el token actual');
        this.state.apiTokenValid = true;
        return true;
      } else {
        console.log('❌ Token de API no válido:', response.status);
        this.state.apiTokenValid = false;
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error validando acceso a API:', error);
      this.state.apiTokenValid = false;
      return false;
    }
  }

  /**
   * Refresca el token de API si es necesario
   */
  async refreshApiTokenIfNeeded(): Promise<boolean> {
    const tokenInfo = authService.getTokenInfo();
    
    // Si no hay token o está próximo a expirar
    if (!tokenInfo.token || !tokenInfo.expiresAt || 
        Date.now() > (tokenInfo.expiresAt - 300000)) { // 5 minutos antes
      
      console.log('🔄 Refrescando token de API...');
      
      try {
        const newToken = await authService.refreshToken();
        if (newToken) {
          this.state.hasApiToken = true;
          this.state.apiTokenValid = true;
          this.state.lastTokenRefresh = Date.now();
          
          // Validar nuevo token
          await this.validateApiAccess();
          this.notifySubscribers();
          
          return true;
        }
      } catch (error) {
        console.error('❌ Error refrescando token:', error);
        this.state.hasApiToken = false;
        this.state.apiTokenValid = false;
        this.notifySubscribers();
      }
    }
    
    return this.state.apiTokenValid;
  }

  /**
   * Obtiene headers autenticados para requests
   */
  async getAuthenticatedHeaders(): Promise<Record<string, string>> {
    // Asegurar que el token esté válido
    await this.refreshApiTokenIfNeeded();
    
    if (this.state.apiTokenValid) {
      return await authService.getAuthHeaders();
    } else {
      // Fallback a headers públicos
      console.log('⚠️ Usando headers públicos - token no válido');
      return authService.getPublicHeaders();
    }
  }

  /**
   * Realiza una petición autenticada a la API
   */
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getAuthenticatedHeaders();
    
  const baseUrl = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };
    
    console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, requestOptions);
      
      // Si obtenemos 401, intentar refrescar token
      if (response.status === 401 && this.state.hasApiToken) {
        console.log('🔄 Token expirado, intentando refrescar...');
        
        const refreshed = await this.refreshApiTokenIfNeeded();
        if (refreshed) {
          // Reintentar con nuevo token
          const newHeaders = await this.getAuthenticatedHeaders();
          const retryResponse = await fetch(fullUrl, {
            ...requestOptions,
            headers: {
              ...newHeaders,
              ...options.headers
            }
          });
          
          if (retryResponse.ok) {
            console.log('✅ Request exitoso después de refresh');
          }
          
          return retryResponse;
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error en request autenticado:', error);
      throw error;
    }
  }

  /**
   * Resetea el estado de autenticación
   */
  logout(): void {
    console.log('👋 Reseteando flujo de autenticación...');
    
    authService.clearToken();
    this.state = {
      isAuth0Authenticated: false,
      hasApiToken: false,
      apiTokenValid: false,
      userInfo: null,
      lastTokenRefresh: 0
    };
    
    this.notifySubscribers();
  }

  /**
   * Obtiene el estado actual del flujo
   */
  getState(): AuthFlowState {
    return { ...this.state };
  }

  /**
   * Suscribirse a cambios en el estado
   */
  subscribe(callback: (state: AuthFlowState) => void): () => void {
    this.subscribers.push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a todos los suscriptores
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error notificando suscriptor:', error);
      }
    });
  }

  /**
   * Inicializa el servicio cuando la app carga
   */
  async initialize(): Promise<void> {
    console.log('🔧 Inicializando AuthFlowService...');
    
    // Intentar obtener token de API sin Auth0 (modo desarrollo)
    try {
      const token = await authService.getToken();
      if (token) {
        this.state.hasApiToken = true;
        this.state.lastTokenRefresh = Date.now();
        await this.validateApiAccess();
      }
    } catch (error) {
      console.log('ℹ️ No se pudo obtener token inicial:', error);
    }
    
    this.notifySubscribers();
  }
}

// Instancia singleton
export const authFlowService = new AuthFlowService();

// Exponer para debug en desarrollo
if (import.meta.env.DEV) {
  (window as any).authFlowService = authFlowService;
}
