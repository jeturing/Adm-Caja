import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { ENV } from '../../config/env';

const Auth0TokenTester: React.FC = () => {
  const { getAccessTokenSilently, user, isAuthenticated } = useAuth0();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [auth0Token, setAuth0Token] = useState<string>('');

  const getAuth0Token = async () => {
    try {
      console.log('🔑 Obteniendo token de Auth0...');
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: ENV.API_BASE_URL.endsWith('/api') ? ENV.API_BASE_URL : `${ENV.API_BASE_URL}/api`,
          scope: 'openid profile email'
        }
      });
      
      console.log('✅ Token Auth0 obtenido:', token.substring(0, 50) + '...');
      setAuth0Token(token);
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo token Auth0:', error);
      throw error;
    }
  };

  const testWithAuth0Token = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Obtener token fresco de Auth0
      const token = await getAuth0Token();
      
      const endpoints = ['/health', '/status', '/playlists', '/videos', '/segments'];
      const results = [];
      
      for (const endpoint of endpoints) {
        console.log(`🔍 Probando ${endpoint} con token Auth0...`);
        
        try {
          const response = await fetch(`/api${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          let responseData = null;
          try {
            const text = await response.text();
            if (text) {
              responseData = JSON.parse(text);
            }
          } catch (e) {
            // Ignorar errores de parsing JSON
          }

          const result = {
            endpoint,
            status: response.status,
            success: response.ok,
            response: responseData,
            error: !response.ok ? `HTTP ${response.status}` : null
          };

          results.push(result);
          setTestResults(prev => [...prev, result]);

          if (response.ok) {
            console.log(`✅ ÉXITO con Auth0: ${endpoint} - Status: ${response.status}`);
          }
        } catch (error) {
          const result = {
            endpoint,
            status: 0,
            success: false,
            response: null,
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
          results.push(result);
          setTestResults(prev => [...prev, result]);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`📊 Pruebas Auth0 completadas: ${successCount}/${results.length} exitosas`);
      
    } catch (error) {
      console.error('❌ Error en pruebas Auth0:', error);
      alert('Error obteniendo token de Auth0: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectApiCall = async () => {
    try {
      console.log('🌐 Probando llamada directa a la API externa...');
      
      const response = await fetch('https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📞 Respuesta directa: ${response.status}`);
      const text = await response.text();
      console.log(`📝 Contenido directo:`, text);
      
      alert(`Llamada directa: ${response.status} - ${text}`);
    } catch (error) {
      console.error('❌ Error en llamada directa:', error);
      alert(`Error en llamada directa: ${error}`);
    }
  };

  // Se elimina el flujo directo de client credentials en navegador por seguridad.

  const successfulTests = testResults.filter(r => r.success);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            🎟️ Pruebas Avanzadas de Autenticación
          </h3>
          <p className="text-sm text-gray-600">
            {isAuthenticated ? `✅ Autenticado como: ${user?.email}` : '❌ No autenticado'}
          </p>
        </div>
      </div>

      {/* Información del token Auth0 actual */}
      {auth0Token && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-800 mb-2">🎟️ Token Auth0 Activo:</h4>
          <div className="text-xs text-blue-700 font-mono break-all">
            {auth0Token.substring(0, 100)}...
          </div>
        </div>
      )}

      {/* Botones de prueba */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={testWithAuth0Token}
          disabled={isLoading || !isAuthenticated}
          className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Probando...' : '🎟️ Test con Auth0'}
        </button>
        
        <button
          onClick={testDirectApiCall}
          className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          🌐 Llamada Directa
        </button>
        
  {/* Client Credentials button removido por seguridad */}

        <button
          onClick={getAuth0Token}
          disabled={!isAuthenticated}
          className="px-4 py-3 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
        >
          🔑 Obtener Token
        </button>
      </div>

      {/* Resultados exitosos */}
      {successfulTests.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">🎉 Pruebas Exitosas con Auth0:</h4>
          {successfulTests.map((result, index) => (
            <div key={index} className="mb-2 p-2 bg-white rounded border border-green-200">
              <div className="font-medium text-green-700">
                ✅ {result.endpoint} - Status: {result.status}
              </div>
              {result.response && (
                <div className="text-xs text-gray-600 mt-1">
                  {JSON.stringify(result.response).substring(0, 150)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resumen de resultados */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-700">{testResults.length}</div>
          <div className="text-sm text-gray-600">Tests Realizados</div>
        </div>
        <div className="text-center p-3 bg-green-100 rounded">
          <div className="text-2xl font-bold text-green-600">{successfulTests.length}</div>
          <div className="text-sm text-green-600">Exitosos</div>
        </div>
        <div className="text-center p-3 bg-red-100 rounded">
          <div className="text-2xl font-bold text-red-600">{testResults.filter(r => r.status === 401).length}</div>
          <div className="text-sm text-red-600">401 Auth Error</div>
        </div>
      </div>

      {/* Lista de resultados */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-3 border rounded ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-800">
                  {result.success ? '✅' : '❌'} {result.endpoint}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600">{result.error}</div>
                )}
              </div>
              <div className="text-right">
                <div className={`font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-800 mb-2">💡 Información de Debugging:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Auth0 Domain: {ENV.AUTH0_DOMAIN}</div>
          <div>• Client ID: {ENV.AUTH0_CLIENT_ID || '(no configurado)'}</div>
          <div>• Audience: {ENV.API_BASE_URL}</div>
          <div>• Usuario actual: {user?.email || 'No autenticado'}</div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-2 text-gray-600">Ejecutando pruebas avanzadas...</div>
        </div>
      )}
    </div>
  );
};

export default Auth0TokenTester;
