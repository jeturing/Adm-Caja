/**
 * Cliente API simplificado para uso en servicios
 * Wrapper sobre apiService con interfaz más simple
 */

import { apiService, ApiResponse } from './apiService';

// Interfaz simplificada para el cliente API
interface SimpleApiClient {
  get<T>(url: string): Promise<{ data: T }>;
  post<T>(url: string, data?: any): Promise<{ data: T }>;
  put<T>(url: string, data?: any): Promise<{ data: T }>;
  delete<T>(url: string): Promise<{ data?: T }>;
}

// Función para convertir ApiResponse a formato simple
function simplifyResponse<T>(response: ApiResponse<T>): { data: T } {
  if (response.data === undefined) {
    throw new Error('No data received from API');
  }
  return { data: response.data };
}

// Cliente API simplificado
export const apiClient: SimpleApiClient = {
  async get<T>(url: string): Promise<{ data: T }> {
    const response = await apiService.get<T>(url);
    return simplifyResponse(response);
  },

  async post<T>(url: string, data?: any): Promise<{ data: T }> {
    const response = await apiService.post<T>(url, data);
    return simplifyResponse(response);
  },

  async put<T>(url: string, data?: any): Promise<{ data: T }> {
    const response = await apiService.put<T>(url, data);
    return simplifyResponse(response);
  },

  async delete<T>(url: string): Promise<{ data?: T }> {
    const response = await apiService.delete<T>(url);
    return { data: response.data };
  }
};

export default apiClient;
