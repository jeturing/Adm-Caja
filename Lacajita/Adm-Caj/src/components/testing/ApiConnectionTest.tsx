import React, { useState, useEffect } from 'react';
import { realApiService } from '../../services/realApiService';
import { authService } from '../../services/authService';

const ApiConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [authInfo, setAuthInfo] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setError('');
    const results: any[] = [];

    try {
      console.log('🧪 Iniciando test de conexión API...');
      
      // Test 0: Auth Service y Endpoint Discovery
      try {
        console.log('🧪 Test 0: Probando autenticación y discovery...');
        await authService.refreshToken(); // Forzar refresh
        const tokenInfo = authService.getTokenInfo();
        const healthCheck = await authService.checkHealth();
        
        // Test adicional: verificar endpoints disponibles
        console.log('🔍 Verificando endpoints disponibles...');
        const baseUrl = '/api';
        const testEndpoints = [
          '/segments',
          '/playlists', 
          '/videos',
          '/auth/login',
          '/login',
          '/health',
          '/status'
        ];
        
        const endpointResults = [];
        for (const endpoint of testEndpoints) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });
            endpointResults.push({
              endpoint,
              status: response.status,
              statusText: response.statusText,
              available: response.status !== 404
            });
          } catch (error) {
            endpointResults.push({
              endpoint,
              status: 'ERROR',
              statusText: 'Network Error',
              available: false
            });
          }
        }
        
        results.push({ 
          endpoint: 'Authentication', 
          status: 'success', 
          data: { tokenInfo, healthCheck, endpointResults },
          token_type: tokenInfo.type,
          expires_at: tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt).toLocaleString() : 'N/A',
          endpoints_found: endpointResults.filter(e => e.available).length
        });
        setAuthInfo({ tokenInfo, healthCheck, endpointResults });
        console.log('✅ Autenticación OK, tipo:', tokenInfo.type);
        console.log('📡 Endpoints encontrados:', endpointResults.filter(e => e.available).length);
      } catch (error: any) {
        results.push({ 
          endpoint: 'Authentication', 
          status: 'error', 
          error: error.message 
        });
        console.log('❌ Autenticación ERROR:', error.message);
      }

      // Test 1: Segments
      try {
        console.log('🧪 Test 1: Probando /segments...');
        const segments = await realApiService.getSegments();
        results.push({ 
          endpoint: '/segments', 
          status: 'success', 
          data: segments, 
          count: segments.length 
        });
        console.log('✅ /segments OK:', segments.length, 'items');
      } catch (error: any) {
        results.push({ 
          endpoint: '/segments', 
          status: 'error', 
          error: error.message 
        });
        console.log('❌ /segments ERROR:', error.message);
      }

      // Test 2: Playlists (datos completos)
      try {
        console.log('🧪 Test 2: Probando /playlists (complete data)...');
        const playlists = await realApiService.getCompletePlaylistData();
        results.push({ 
          endpoint: '/playlists (complete)', 
          status: 'success', 
          data: playlists,
          segments: playlists.segments?.length || 0,
          carousel: playlists.homecarousel?.length || 0
        });
        console.log('✅ /playlists (complete) OK');
      } catch (error: any) {
        results.push({ 
          endpoint: '/playlists (complete)', 
          status: 'error', 
          error: error.message 
        });
        console.log('❌ /playlists (complete) ERROR:', error.message);
      }

      // Test 3: Home Carousel
      try {
        console.log('🧪 Test 3: Probando /home-carousel...');
        const carousel = await realApiService.getHomeCarousel();
        results.push({ 
          endpoint: '/home-carousel', 
          status: 'success', 
          data: carousel, 
          count: carousel.length 
        });
        console.log('✅ /home-carousel OK:', carousel.length, 'items');
      } catch (error: any) {
        results.push({ 
          endpoint: '/home-carousel', 
          status: 'error', 
          error: error.message 
        });
        console.log('❌ /home-carousel ERROR:', error.message);
      }

      setTestResults(results);
      
      // Determinar estado general
      const hasSuccess = results.some(r => r.status === 'success');
      const hasError = results.some(r => r.status === 'error');
      
      if (hasSuccess && !hasError) {
        setConnectionStatus('success');
      } else if (hasSuccess) {
        setConnectionStatus('success'); // Parcial
      } else {
        setConnectionStatus('error');
      }

      console.log('🧪 Test completado. Resultados:', results);
      
    } catch (error: any) {
      console.error('❌ Error general en test de conexión:', error);
      setError(error.message);
      setConnectionStatus('error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🧪 Test de Conexión API
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              console.log('🔄 Refresh token manual...');
              await authService.refreshToken();
              testConnection();
            }}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            🔑 Refresh Auth
          </button>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Repetir Test
          </button>
        </div>
      </div>

      {/* Estado General */}
      <div className="mb-6">
        <div className={`text-lg font-medium ${getStatusColor(connectionStatus)}`}>
          {getStatusIcon(connectionStatus)} Estado: {
            connectionStatus === 'testing' ? 'Probando...' :
            connectionStatus === 'success' ? 'Conexión Exitosa' :
            'Error de Conexión'
          }
        </div>
        {error && (
          <div className="mt-2 text-red-600 text-sm">
            Error general: {error}
          </div>
        )}
      </div>

      {/* Resultados de Tests */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Resultados por Endpoint:</h4>
        
        {testResults.length === 0 && connectionStatus === 'testing' && (
          <div className="text-gray-500">⏳ Ejecutando tests...</div>
        )}

        {testResults.map((result, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className={`font-medium ${getStatusColor(result.status)}`}>
                  {getStatusIcon(result.status)} {result.endpoint}
                </div>
                
                {result.status === 'success' ? (
                  <div className="mt-2 text-sm text-gray-600">
                    {result.count !== undefined && (
                      <div>📊 Items encontrados: {result.count}</div>
                    )}
                    {result.segments !== undefined && (
                      <div>🏷️ Segments: {result.segments}</div>
                    )}
                    {result.carousel !== undefined && (
                      <div>🎠 Carousel: {result.carousel}</div>
                    )}
                    {result.token_type && (
                      <div>🔑 Token: {result.token_type}</div>
                    )}
                    {result.expires_at && (
                      <div>⏰ Expira: {result.expires_at}</div>
                    )}
                    {result.endpoints_found !== undefined && (
                      <div>📡 Endpoints: {result.endpoints_found}/8</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-red-600">
                    ❌ Error: {result.error}
                  </div>
                )}
              </div>
              
              {result.data?.endpointResults && (
                <details className="ml-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Ver endpoints disponibles
                  </summary>
                  <div className="mt-2 text-xs bg-gray-100 p-2 rounded space-y-1">
                    {result.data.endpointResults.map((ep: any, idx: number) => (
                      <div key={idx} className={`flex justify-between ${
                        ep.available ? 'text-green-700' : 'text-red-700'
                      }`}>
                        <span>{ep.endpoint}</span>
                        <span>{ep.status} {ep.statusText}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              
              {result.data && !result.data.endpointResults && (
                <details className="ml-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Ver datos
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Información de Desarrollo */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">🔧 Información de Desarrollo</h5>
        <div className="text-sm text-blue-800 space-y-1">
          <div>Modo: {import.meta.env.DEV ? 'Desarrollo' : 'Producción'}</div>
          <div>URL Base: {import.meta.env.VITE_API_BASE_URL}</div>
          <div>Proxy: {import.meta.env.DEV ? '/api (SSL bypass)' : 'Directo'}</div>
          {authInfo && (
            <>
              <div>Auth Token: {authInfo.tokenInfo?.type || 'N/A'}</div>
              <div>La Cajita: {authInfo.healthCheck?.lacajita ? '✅' : '❌'}</div>
              <div>Auth0: {authInfo.healthCheck?.auth0 ? '✅' : '❌'}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiConnectionTest;
