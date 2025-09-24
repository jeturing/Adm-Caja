import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { realApiService } from '../../services/realApiService';

const ApiTestComponent: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testGetToken = async () => {
    setLoading(true);
    setError('');
    try {
      const tokenResult = await authService.getToken();
      setToken(tokenResult);
      console.log('✅ Token obtenido:', tokenResult.substring(0, 50) + '...');
    } catch (err) {
      setError(`Error obteniendo token: ${err}`);
      console.error('❌ Error obteniendo token:', err);
    } finally {
      setLoading(false);
    }
  };

  const testHealthCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const health = await realApiService.checkHealth();
      setHealthCheck(health);
      console.log('✅ Health check exitoso:', health);
    } catch (err) {
      setError(`Error en health check: ${err}`);
      console.error('❌ Error en health check:', err);
    } finally {
      setLoading(false);
    }
  };

  const testUserInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const info = await authService.getUserInfo();
      setUserInfo(info);
      console.log('✅ Info de usuario obtenida:', info);
    } catch (err) {
      setError(`Error obteniendo info de usuario: ${err}`);
      console.error('❌ Error obteniendo info de usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setToken('');
    setHealthCheck(null);
    setUserInfo(null);
    setError('');
    authService.clearToken();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          🧪 Pruebas de API - La Cajita TV
        </h2>

        {/* Configuración actual */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">🔧 Configuración</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL}</div>
            <div><strong>Secret Key:</strong> {import.meta.env.VITE_SECRET_KEY ? '***' + import.meta.env.VITE_SECRET_KEY.slice(-8) : 'No configurado'}</div>
            <div><strong>Auth0 Domain:</strong> {import.meta.env.VITE_AUTH0_DOMAIN}</div>
          </div>
        </div>

        {/* Botones de prueba */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={testGetToken}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            🔑 Obtener Token
          </button>
          
          <button
            onClick={testHealthCheck}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            ❤️ Health Check
          </button>
          
          <button
            onClick={testUserInfo}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            👤 Info Usuario
          </button>
          
          <button
            onClick={clearAll}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            🗑️ Limpiar
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Ejecutando prueba...</span>
            </div>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados */}
        <div className="space-y-4">
          {/* Token */}
          {token && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🔑 Token JWT</h3>
              <div className="text-sm text-green-800 font-mono break-all">
                {token.substring(0, 100)}...
              </div>
            </div>
          )}

          {/* Health Check */}
          {healthCheck && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">❤️ Health Check</h3>
              <pre className="text-sm text-green-800 bg-green-100 p-2 rounded overflow-auto">
                {JSON.stringify(healthCheck, null, 2)}
              </pre>
            </div>
          )}

          {/* User Info */}
          {userInfo && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">👤 Información del Usuario</h3>
              <pre className="text-sm text-purple-800 bg-purple-100 p-2 rounded overflow-auto">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">📋 Instrucciones</h3>
          <div className="text-sm text-yellow-800 space-y-1">
            <div>1. <strong>Obtener Token:</strong> Prueba la autenticación client_credentials</div>
            <div>2. <strong>Health Check:</strong> Verifica que el backend esté disponible</div>
            <div>3. <strong>Info Usuario:</strong> Obtiene datos del usuario Auth0 autenticado</div>
            <div>4. <strong>Limpiar:</strong> Limpia cache y resultados para empezar de nuevo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTestComponent;
