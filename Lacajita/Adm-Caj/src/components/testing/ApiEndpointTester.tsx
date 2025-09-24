import React, { useState } from 'react';

interface TestResult {
  endpoint: string;
  method: string;
  headers: string;
  status: number | string;
  statusText: string;
  success: boolean;
  responseTime: number;
  data?: any;
  error?: string;
}

const ApiEndpointTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const endpoints = [
    '/segments',
    '/playlists',
    '/videos',
    '/home-carousel',
    '/health',
    '/status',
    '/api-info'
  ];

  const headerSets = [
    {
      name: 'Sin Headers',
      headers: {} as Record<string, string>
    },
    {
      name: 'Headers Básicos',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      } as Record<string, string>
    },
    {
      name: 'Headers Usuario',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LaCajita-Dashboard/1.0'
      } as Record<string, string>
    },
    {
      name: 'Headers Dev',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Dev-Mode': 'true',
        'X-Client-Secret': '3e1601b5f867d06c2de5ef515ae93e23e'
      } as Record<string, string>
    }
  ];

  const testAllCombinations = async () => {
    setIsLoading(true);
    setTestResults([]);
    const results: TestResult[] = [];

    for (const endpoint of endpoints) {
      for (const headerSet of headerSets) {
        const startTime = Date.now();
        
        try {
          console.log(`🧪 Testing ${endpoint} with ${headerSet.name}`);
          
          const response = await fetch(`/api${endpoint}`, {
            method: 'GET',
            headers: headerSet.headers
          });

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          let data;
          try {
            data = await response.json();
          } catch {
            data = await response.text();
          }

          results.push({
            endpoint,
            method: 'GET',
            headers: headerSet.name,
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            responseTime,
            data: response.ok ? data : undefined,
            error: !response.ok ? `${response.status} ${response.statusText}` : undefined
          });

        } catch (error: any) {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          results.push({
            endpoint,
            method: 'GET',
            headers: headerSet.name,
            status: 'ERROR',
            statusText: 'Network Error',
            success: false,
            responseTime,
            error: error.message
          });
        }
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const getStatusColor = (success: boolean, status: number | string) => {
    if (success) return 'text-green-600';
    if (status === 401) return 'text-orange-600';
    if (status === 404) return 'text-red-600';
    return 'text-gray-600';
  };

  const successfulTests = testResults.filter(r => r.success);
  const authRequiredTests = testResults.filter(r => r.status === 401);
  const notFoundTests = testResults.filter(r => r.status === 404);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            🔬 Test Exhaustivo de Endpoints
          </h3>
          <p className="text-sm text-gray-600">
            Prueba todos los endpoints con diferentes configuraciones de headers
          </p>
        </div>
        <button
          onClick={testAllCombinations}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? '⏳ Probando...' : '🔬 Ejecutar Tests'}
        </button>
      </div>

      {/* Estadísticas rápidas */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-3 rounded">
            <div className="text-green-800 font-medium">✅ Exitosos</div>
            <div className="text-2xl font-bold text-green-900">{successfulTests.length}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-orange-800 font-medium">🔐 Auth Requerida</div>
            <div className="text-2xl font-bold text-orange-900">{authRequiredTests.length}</div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-red-800 font-medium">❌ No Encontrados</div>
            <div className="text-2xl font-bold text-red-900">{notFoundTests.length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-blue-800 font-medium">📊 Total</div>
            <div className="text-2xl font-bold text-blue-900">{testResults.length}</div>
          </div>
        </div>
      )}

      {/* Resultados exitosos */}
      {successfulTests.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-green-900 mb-3">✅ Endpoints Funcionando</h4>
          <div className="space-y-2">
            {successfulTests.map((result, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-green-900">{result.endpoint}</span>
                    <span className="ml-2 text-sm text-green-700">con {result.headers}</span>
                  </div>
                  <div className="flex space-x-2 text-sm text-green-600">
                    <span>{result.status}</span>
                    <span>{result.responseTime}ms</span>
                  </div>
                </div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-green-600 cursor-pointer">Ver respuesta</summary>
                    <pre className="mt-1 text-xs bg-green-100 p-2 rounded overflow-auto max-h-20">
                      {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      {testResults.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Headers</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {testResults.map((result, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{result.endpoint}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{result.headers}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={getStatusColor(result.success, result.status)}>
                      {result.status} {result.statusText}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{result.responseTime}ms</td>
                  <td className="px-4 py-2 text-sm">
                    {result.success ? (
                      <span className="text-green-600">✅ OK</span>
                    ) : (
                      <span className="text-red-600">❌ {result.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            ⏳ Ejecutando {endpoints.length * headerSets.length} tests...
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Esto puede tomar unos segundos
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiEndpointTester;
