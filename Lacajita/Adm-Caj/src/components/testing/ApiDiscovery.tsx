import React, { useState, useEffect } from 'react';

const ApiDiscovery: React.FC = () => {
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Endpoints comunes de documentación y información
  const discoveryEndpoints = [
    '/docs',
    '/documentation',
    '/api-docs',
    '/swagger',
    '/swagger.json',
    '/openapi.json',
    '/api/v1',
    '/api/docs',
    '/help',
    '/info',
    '/version',
    '/ping',
    '/',
    '/favicon.ico'
  ];

  const discoverEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`/api${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      let content = '';
      let contentType = response.headers.get('content-type') || '';
      
      try {
        content = await response.text();
      } catch (e) {
        content = '[No se pudo leer el contenido]';
      }

      return {
        endpoint,
        status: response.status,
        success: response.ok,
        contentType,
        contentLength: content.length,
        content: content.substring(0, 200), // Primeros 200 caracteres
        hasContent: content.length > 0
      };
    } catch (error) {
      return {
        endpoint,
        status: 0,
        success: false,
        contentType: '',
        contentLength: 0,
        content: '',
        hasContent: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  const runDiscovery = async () => {
    setIsLoading(true);
    setDiscoveryResults([]);
    
    console.log('🕵️ Iniciando descubrimiento de API...');
    
    const results = [];
    
    for (const endpoint of discoveryEndpoints) {
      console.log(`🔍 Explorando: ${endpoint}`);
      const result = await discoverEndpoint(endpoint);
      results.push(result);
      setDiscoveryResults(prev => [...prev, result]);
      
      if (result.success) {
        console.log(`✅ Encontrado: ${endpoint} - ${result.status} - ${result.contentType}`);
      }
      
      // Pausa pequeña
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsLoading(false);
    
    const foundEndpoints = results.filter(r => r.success);
    console.log(`📊 Descubrimiento completado: ${foundEndpoints.length}/${results.length} endpoints encontrados`);
  };

  useEffect(() => {
    runDiscovery();
  }, []);

  const getStatusIcon = (result: any) => {
    if (result.success) return '✅';
    if (result.status === 401) return '🔒';
    if (result.status === 404) return '❓';
    if (result.status === 403) return '🚫';
    return '❌';
  };

  const getContentTypeColor = (contentType: string) => {
    if (contentType.includes('json')) return 'text-blue-600';
    if (contentType.includes('html')) return 'text-green-600';
    if (contentType.includes('xml')) return 'text-purple-600';
    if (contentType.includes('text')) return 'text-gray-600';
    return 'text-gray-500';
  };

  const successfulResults = discoveryResults.filter(r => r.success);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          🕵️ Descubrimiento de Endpoints API
        </h3>
        <button
          onClick={runDiscovery}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          {isLoading ? 'Explorando...' : 'Reiniciar Exploración'}
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-700">{discoveryResults.length}</div>
          <div className="text-sm text-gray-600">Explorados</div>
        </div>
        <div className="text-center p-3 bg-green-100 rounded">
          <div className="text-2xl font-bold text-green-600">{successfulResults.length}</div>
          <div className="text-sm text-green-600">Encontrados</div>
        </div>
        <div className="text-center p-3 bg-blue-100 rounded">
          <div className="text-2xl font-bold text-blue-600">{discoveryResults.filter(r => r.contentType.includes('json')).length}</div>
          <div className="text-sm text-blue-600">JSON</div>
        </div>
        <div className="text-center p-3 bg-purple-100 rounded">
          <div className="text-2xl font-bold text-purple-600">{discoveryResults.filter(r => r.hasContent && r.success).length}</div>
          <div className="text-sm text-purple-600">Con Contenido</div>
        </div>
      </div>

      {/* Resultados exitosos destacados */}
      {successfulResults.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-3">🎉 Endpoints Disponibles:</h4>
          {successfulResults.map((result, index) => (
            <div key={index} className="mb-3 p-3 bg-white rounded border border-green-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-green-700">
                    ✅ {result.endpoint}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {result.status} | 
                    <span className={`ml-1 ${getContentTypeColor(result.contentType)}`}>
                      {result.contentType || 'sin tipo'}
                    </span> | 
                    {result.contentLength} bytes
                  </div>
                </div>
              </div>
              
              {result.content && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                  {result.content}
                  {result.contentLength > 200 && '...'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista completa de resultados */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {discoveryResults.map((result, index) => (
          <div
            key={index}
            className={`p-3 border rounded flex justify-between items-center ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getStatusIcon(result)}</span>
              <div>
                <div className="font-medium text-gray-800">
                  {result.endpoint}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600">{result.error}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-700">
                {result.status}
              </div>
              <div className="text-sm text-gray-500">
                {result.contentLength} bytes
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <div className="mt-2 text-gray-600">Explorando endpoints...</div>
        </div>
      )}
    </div>
  );
};

export default ApiDiscovery;
