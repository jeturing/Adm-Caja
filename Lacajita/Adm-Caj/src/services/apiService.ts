import { API_CONFIG, buildApiUrl } from '../config/api';
import { ENV } from '../config/env';

// Tipos de respuesta de la API
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Clase para manejar errores de la API
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Servicio principal para peticiones HTTP
class ApiService {
  private token: string | null = null;

  constructor() {
    // Cargar token desde localStorage al iniciar
    this.loadToken();
  }

  // Método para establecer el token de autenticación
  setToken(token: string) {
    this.token = token;
    // Guardar token en localStorage
    localStorage.setItem('authToken', token);
  }

  // Método para limpiar el token
  clearToken() {
    this.token = null;
    // Eliminar token de localStorage
    localStorage.removeItem('authToken');
  }

  // Método para cargar el token desde localStorage
  loadToken() {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  // Método para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Método privado para obtener headers con autenticación
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      // Removemos Content-Type para evitar preflight en peticiones GET
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Método genérico para hacer peticiones HTTP
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const url = buildApiUrl(endpoint);
      const headers = { ...this.getHeaders(), ...customHeaders };

      if (ENV.DEV_MODE) {
        console.log(`📡 ${method} ${url}`);
      }

      const config: RequestInit = {
        method,
        headers,
        mode: 'cors',
        credentials: 'omit',
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      
      // Intentar parsear la respuesta como JSON
      let data: T | null = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.warn('⚠️ Error parseando JSON:', parseError);
        }
      }

      if (!response.ok) {
        const error = new ApiError(
          `HTTP Error ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
        
        if (ENV.DEV_MODE) {
          console.error(`❌ ${method} ${url} - ${response.status}`, error);
        }
        
        throw error;
      }

      if (ENV.DEV_MODE) {
        console.log(`✅ ${method} ${url} - ${response.status}`);
      }

      return {
        data: data || undefined,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const networkError = new ApiError(
        `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
      
      if (ENV.DEV_MODE) {
        console.error(`❌ ${method} ${endpoint} - Network Error:`, error);
      }
      
      throw networkError;
    }
  }

  // Métodos HTTP específicos
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  // Método para obtener token usando client credentials
  async getClientCredentialsToken(): Promise<string> {
    try {
      const response = await this.post<{ access_token: string }>(
        API_CONFIG.ENDPOINTS.AUTH.CLIENT_CREDENTIALS,
        { client_secret: ENV.CLIENT_SECRET }
      );

      if (response.data?.access_token) {
        this.setToken(response.data.access_token);
        return response.data.access_token;
      }

      throw new Error('No access token received');
    } catch (error) {
      console.error('Error getting client credentials token:', error);
      throw error;
    }
  }

  // Método para login con email y password
  async login(email: string, password: string): Promise<string> {
    try {
      // El endpoint /login de producción usa POST con query parameters
      const response = await this.post<{ access_token: string }>(
        `${API_CONFIG.ENDPOINTS.AUTH.LOGIN}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        {}
      );

      if (response.data?.access_token) {
        this.setToken(response.data.access_token);
        return response.data.access_token;
      }

      throw new Error('No access token received');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  // Método para obtener usuarios de Auth0
  async getAuth0Users(): Promise<any[]> {
    try {
      const response = await this.post<any[]>('/auth0/users');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error getting Auth0 users:', error);
      throw error;
    }
  }

  // Método para obtener el perfil del usuario autenticado
  async getMe(): Promise<{ sub: string; email: string; name: string }> {
    try {
      const response = await this.post<{ sub: string; email: string; name: string }>('/user/me');
      
      // Debug: mostrar la respuesta completa
      if (ENV.DEV_MODE) {
        console.log('🔍 getMe response:', response);
      }
      
      // Verificar si tenemos datos y si al menos tienen email
      if (response.data) {
        // Si response.data es null pero status es 200, significa que no hay usuario autenticado
        if (response.data === null) {
          throw new Error('No user authenticated');
        }
        
        // Verificar que tenga las propiedades necesarias
        if (response.data.email) {
          return {
            sub: response.data.sub || '',
            email: response.data.email,
            name: response.data.name || response.data.email
          };
        }
      }
      
      throw new Error('Invalid user data received');
    } catch (error) {
      if (ENV.DEV_MODE) {
        console.error('❌ Error fetching user profile:', error);
      }
      
      // Si es un error 401 o 403, limpiar token
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        this.clearToken();
      }
      
      throw error;
    }
  }

  // Método para verificar la salud de la API
  async healthCheck(): Promise<ApiResponse<{ status: string; service: string; version: string }>> {
    return this.get(API_CONFIG.ENDPOINTS.HEALTH);
  }
}

// Exportar una instancia singleton del servicio
export const apiService = new ApiService();

// Exportar también la clase para casos especiales
export default ApiService;
