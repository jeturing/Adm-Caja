import React, { useState, useEffect } from 'react';
import { lacajitaApiService } from '../../services/lacajitaApiService';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  timestamp: string;
}

const ComprehensiveApiTester: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = () => {
    const currentStatus = lacajitaApiService.getStatus();
    setStatus(currentStatus);
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]);
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    
    console.log('🚀 Iniciando prueba completa de autenticación...');
    
    try {
      const success = await lacajitaApiService.authenticate();
      
      addResult({
        name: '🔐 Autenticación Completa',
        success,
        data: lacajitaApiService.getStatus(),
        timestamp: new Date().toLocaleTimeString()
      });
      
      updateStatus();
    } catch (error) {
      addResult({
        name: '🔐 Autenticación Completa',
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectivity = async () => {
    setIsLoading(true);
    
    try {
      const result = await lacajitaApiService.testConnection();
      
      addResult({
        name: '🌐 Test de Conectividad',
        success: result.success,
        data: result.endpoints,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        name: '🌐 Test de Conectividad',
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSpecificEndpoint = async (endpoint: string, name: string) => {
    setIsLoading(true);
    
    try {
      const data = await lacajitaApiService.getData(endpoint);
      
      addResult({
        name: `📊 ${name}`,
        success: true,
        data: Array.isArray(data) ? { count: data.length, items: data.slice(0, 3) } : data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        name: `📊 ${name}`,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runCompleteTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    console.log('🎯 Ejecutando test completo de la API...');
    
    // 1. Test de autenticación
    await testAuthentication();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. Test de conectividad
    await testConnectivity();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Test de endpoints específicos
    const endpoints = [
      { endpoint: '/playlists', name: 'Playlists' },
      { endpoint: '/videos?active=1', name: 'Videos Activos' },
      { endpoint: '/seasons?active=1', name: 'Seasons Activas' },
      { endpoint: '/home-carousel', name: 'Home Carousel' },
      { endpoint: '/segments', name: 'Segments' }
    ];
    
    for (const ep of endpoints) {
      await testSpecificEndpoint(ep.endpoint, ep.name);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsLoading(false);
    console.log('✅ Test completo finalizado');
  };

  const clearResults = () => {
    setResults([]);
    lacajitaApiService.clearToken();
    updateStatus();
  };

  const formatExpiresIn = (milliseconds: number | null): string => {
    if (!milliseconds) return 'N/A';
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          🧪 Test Completo de La Cajita API
        </h3>
        <div className="flex gap-2">
          <button
            onClick={runCompleteTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Ejecutando...' : '🎯 Test Completo'}
          </button>
          <button
            onClick={clearResults}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Estado actual */}
      {status && (
        <div className={`mb-6 p-4 rounded-lg ${
          status.authenticated ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            {status.authenticated ? '✅' : '❌'} Estado de Autenticación
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Estado:</strong> {status.authenticated ? 'Autenticado' : 'No autenticado'}
            </div>
            <div>
              <strong>Tipo:</strong> {status.tokenType || 'N/A'}
            </div>
            <div>
              <strong>Expira en:</strong> {formatExpiresIn(status.expiresIn)}
            </div>
          </div>
        </div>
      )}

      {/* Botones de test individuales */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={testAuthentication}
          disabled={isLoading}
          className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
        >
          🔐 Auth
        </button>
        <button
          onClick={testConnectivity}
          disabled={isLoading}
          className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
        >
          🌐 Conectividad
        </button>
        <button
          onClick={() => testSpecificEndpoint('/playlists', 'Playlists')}
          disabled={isLoading}
          className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
        >
          📊 Playlists
        </button>
      </div>

      {/* Resultados */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-gray-800">
                {result.name}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.success ? '✅ OK' : '❌ Error'}
                </span>
                <span className="text-xs text-gray-500">{result.timestamp}</span>
              </div>
            </div>
            
            {result.status && (
              <div className="text-sm text-gray-600 mb-2">
                Status: {result.status}
              </div>
            )}
            
            {result.error && (
              <div className="text-sm text-red-600 mb-2">
                Error: {result.error}
              </div>
            )}
            
            {result.data && (
              <div className="text-xs text-gray-700 bg-gray-100 p-2 rounded mt-2">
                <details>
                  <summary className="cursor-pointer font-medium">Ver datos</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-2 text-gray-600">Ejecutando pruebas...</div>
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          🚀 Haz clic en "Test Completo" para comenzar las pruebas
        </div>
      )}
    </div>
  );
};

export default ComprehensiveApiTester;
