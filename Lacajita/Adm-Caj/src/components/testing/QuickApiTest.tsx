import React, { useState, useEffect } from 'react';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseSize: number;
  error?: string;
  data?: any;
}

const QuickApiTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    successful: 0,
    unauthorized: 0,
    notFound: 0,
    otherErrors: 0
  });

  // Endpoints principales de la API
  const endpoints = [
    '/playlists',
    '/videos', 
    '/segments',
    '/home-carousel',
    '/health',
    '/status',
    '/api-info'
  ];

  // Diferentes configuraciones de headers para probar
  const headerConfigurations = [
    {
      name: 'Sin Headers',
      headers: {}
    },
    {
      name: 'Headers Básicos',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Headers con User-Agent',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LaCajitaTV/1.0'
      }
    },
    {
      name: 'Headers Públicos API',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Version': '1.0',
        'X-Client': 'dashboard'
      }
    }
  ];

  const testEndpoint = async (endpoint: string, headerConfig: any): Promise<TestResult> => {
    try {
      const response = await fetch(`/api${endpoint}`, {
        method: 'GET',
        headers: headerConfig.headers,
      });

      let data = null;
      let responseSize = 0;

      try {
        const text = await response.text();
        responseSize = text.length;
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        // Si no es JSON válido, ignorar
      }

      return {
        endpoint,
        method: headerConfig.name,
        status: response.status,
        success: response.ok,
        responseSize,
        data: response.ok ? data : undefined,
        error: !response.ok ? `HTTP ${response.status}` : undefined
      };
    } catch (error) {
      return {
        endpoint,
        method: headerConfig.name,
        status: 0,
        success: false,
        responseSize: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  const runQuickTest = async () => {
    setIsLoading(true);
    setResults([]);
    
    const allResults: TestResult[] = [];
    
    console.log('🔬 Iniciando prueba rápida de API...');
    
    for (const endpoint of endpoints) {
      for (const headerConfig of headerConfigurations) {
        console.log(`Testing ${endpoint} con ${headerConfig.name}...`);
        const result = await testEndpoint(endpoint, headerConfig);
        allResults.push(result);
        
        // Actualizar resultados en tiempo real
        setResults(prev => [...prev, result]);
        
        // Si encontramos un éxito, log especial
        if (result.success) {
          console.log(`✅ ÉXITO: ${endpoint} con ${headerConfig.name} - Status: ${result.status}`);
        }
      }
    }
    
    // Calcular resumen
    const newSummary = {
      total: allResults.length,
      successful: allResults.filter(r => r.success).length,
      unauthorized: allResults.filter(r => r.status === 401).length,
      notFound: allResults.filter(r => r.status === 404).length,
      otherErrors: allResults.filter(r => !r.success && r.status !== 401 && r.status !== 404).length
    };
    
    setSummary(newSummary);
    setIsLoading(false);
    
    console.log('📊 Resumen de pruebas:', newSummary);
  };

  // Ejecutar automáticamente al montar
  useEffect(() => {
    runQuickTest();
  }, []);

  const getStatusColor = (result: TestResult) => {
    if (result.success) return 'text-green-600';
    if (result.status === 401) return 'text-red-600';
    if (result.status === 404) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) return '✅';
    if (result.status === 401) return '🔒';
    if (result.status === 404) return '❓';
    return '❌';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🚀 Prueba Rápida de API
        </h3>
        <button
          onClick={runQuickTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Reiniciar Prueba'}
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center p-3 bg-green-100 rounded">
          <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
          <div className="text-sm text-green-600">Éxitos</div>
        </div>
        <div className="text-center p-3 bg-red-100 rounded">
          <div className="text-2xl font-bold text-red-600">{summary.unauthorized}</div>
          <div className="text-sm text-red-600">401 Auth</div>
        </div>
        <div className="text-center p-3 bg-yellow-100 rounded">
          <div className="text-2xl font-bold text-yellow-600">{summary.notFound}</div>
          <div className="text-sm text-yellow-600">404 Not Found</div>
        </div>
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-600">{summary.otherErrors}</div>
          <div className="text-sm text-gray-600">Otros</div>
        </div>
      </div>

      {/* Resultados exitosos destacados */}
      {results.filter(r => r.success).length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">🎉 Conexiones Exitosas Encontradas:</h4>
          {results.filter(r => r.success).map((result, index) => (
            <div key={index} className="text-green-700 text-sm">
              ✅ <strong>{result.endpoint}</strong> con {result.method} - Status: {result.status} - Tamaño: {result.responseSize} bytes
            </div>
          ))}
        </div>
      )}

      {/* Lista de resultados */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
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
                  <span className="text-sm text-gray-600 ml-2">({result.method})</span>
                </div>
                {result.error && (
                  <div className="text-sm text-red-600">{result.error}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`font-medium ${getStatusColor(result)}`}>
                {result.status}
              </div>
              <div className="text-sm text-gray-500">
                {result.responseSize} bytes
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-2 text-gray-600">Ejecutando pruebas...</div>
        </div>
      )}
    </div>
  );
};

export default QuickApiTest;
