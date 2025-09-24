import React, { useState } from 'react';

interface AuthTestResult {
  method: string;
  endpoint: string;
  status: number;
  success: boolean;
  headers: Record<string, string>;
  response?: any;
  error?: string;
}

const AuthMethodTester: React.FC = () => {
  const [results, setResults] = useState<AuthTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    apiKey: '',
    token: ''
  });

  // Diferentes métodos de autenticación para probar
  const authMethods = [
    {
      name: 'Sin Autenticación',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Basic Auth (admin:admin)',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa('admin:admin')}`
      }
    },
    {
      name: 'Basic Auth (lacajita:lacajita)', 
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa('lacajita:lacajita')}`
      }
    },
    {
      name: 'Basic Auth (api:api)',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa('api:api')}`
      }
    },
    {
      name: 'API Key Header',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': '3e1601b5f867d06c2de5ef515ae93e23e'
      }
    },
    {
      name: 'API Key Authorization',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer 3e1601b5f867d06c2de5ef515ae93e23e'
      }
    },
    {
      name: 'Custom Headers LaJajita',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-ID': 'lacajita-dashboard',
        'X-Client-Secret': '3e1601b5f867d06c2de5ef515ae93e23e',
        'X-Auth-Token': '3e1601b5f867d06c2de5ef515ae93e23e'
      }
    },
    {
      name: 'JWT Token Sample',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkxhQ2FqaXRhIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }
    }
  ];

  const testEndpoints = ['/health', '/status', '/api-info', '/playlists'];

  const testAuthMethod = async (method: any, endpoint: string): Promise<AuthTestResult> => {
    try {
      console.log(`🔍 Probando ${method.name} en ${endpoint}...`);
      
      const response = await fetch(`/api${endpoint}`, {
        method: 'GET',
        headers: method.headers,
      });

      let responseData = null;
      try {
        const text = await response.text();
        if (text) {
          responseData = JSON.parse(text);
        }
      } catch (e) {
        // Ignorar errores de parsing
      }

      const result: AuthTestResult = {
        method: method.name,
        endpoint,
        status: response.status,
        success: response.ok,
        headers: method.headers,
        response: responseData
      };

      if (response.ok) {
        console.log(`✅ ÉXITO: ${method.name} en ${endpoint} - Status: ${response.status}`);
      } else {
        result.error = `HTTP ${response.status} ${response.statusText}`;
      }

      return result;
    } catch (error) {
      console.error(`❌ Error: ${method.name} en ${endpoint}:`, error);
      return {
        method: method.name,
        endpoint,
        status: 0,
        success: false,
        headers: method.headers,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);
    
    const allResults: AuthTestResult[] = [];
    
    console.log('🚀 Iniciando pruebas de autenticación...');
    
    for (const endpoint of testEndpoints) {
      for (const method of authMethods) {
        const result = await testAuthMethod(method, endpoint);
        allResults.push(result);
        setResults(prev => [...prev, result]);
        
        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setIsLoading(false);
    
    const successCount = allResults.filter(r => r.success).length;
    console.log(`📊 Pruebas completadas: ${successCount}/${allResults.length} exitosas`);
    
    if (successCount > 0) {
      console.log('🎉 Métodos de autenticación exitosos encontrados:');
      allResults.filter(r => r.success).forEach(result => {
        console.log(`✅ ${result.method} en ${result.endpoint}`);
      });
    }
  };

  const tryLogin = async () => {
    if (!credentials.username || !credentials.password) {
      alert('Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      console.log('🔐 Intentando login con credenciales...');
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      const data = await response.text();
      
      if (response.ok) {
        console.log('✅ Login exitoso:', data);
        alert(`Login exitoso! Respuesta: ${data}`);
      } else {
        console.log('❌ Login falló:', response.status, data);
        alert(`Login falló: ${response.status} - ${data}`);
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      alert(`Error en login: ${error}`);
    }
  };

  const getStatusBadge = (result: AuthTestResult) => {
    if (result.success) {
      return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">✅ {result.status}</span>;
    }
    if (result.status === 401) {
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">🔒 {result.status}</span>;
    }
    if (result.status === 404) {
      return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">❓ {result.status}</span>;
    }
    return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">❌ {result.status}</span>;
  };

  const successfulResults = results.filter(r => r.success);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          🔐 Pruebas de Métodos de Autenticación
        </h3>
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Probar Todos los Métodos'}
        </button>
      </div>

      {/* Formulario de credenciales manuales */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">🔑 Prueba de Login Manual</h4>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Usuario"
            value={credentials.username}
            onChange={(e) => setCredentials(prev => ({...prev, username: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({...prev, password: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={tryLogin}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔐 Probar Login
        </button>
      </div>

      {/* Resultados exitosos destacados */}
      {successfulResults.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">🎉 Métodos de Autenticación Exitosos:</h4>
          {successfulResults.map((result, index) => (
            <div key={index} className="mb-2 p-2 bg-white rounded border border-green-200">
              <div className="font-medium text-green-700">
                ✅ {result.method} → {result.endpoint}
              </div>
              <div className="text-sm text-green-600">
                Status: {result.status} | Headers: {Object.keys(result.headers).join(', ')}
              </div>
              {result.response && (
                <div className="text-xs text-gray-600 mt-1">
                  Respuesta: {JSON.stringify(result.response).substring(0, 100)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resumen de resultados */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-700">{results.length}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
        <div className="text-center p-3 bg-green-100 rounded">
          <div className="text-2xl font-bold text-green-600">{results.filter(r => r.success).length}</div>
          <div className="text-sm text-green-600">Exitosos</div>
        </div>
        <div className="text-center p-3 bg-red-100 rounded">
          <div className="text-2xl font-bold text-red-600">{results.filter(r => r.status === 401).length}</div>
          <div className="text-sm text-red-600">401 Auth</div>
        </div>
        <div className="text-center p-3 bg-yellow-100 rounded">
          <div className="text-2xl font-bold text-yellow-600">{results.filter(r => r.status === 404).length}</div>
          <div className="text-sm text-yellow-600">404 Not Found</div>
        </div>
      </div>

      {/* Lista de resultados */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 border rounded ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-800">
                  {result.method} → {result.endpoint}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600">{result.error}</div>
                )}
              </div>
              {getStatusBadge(result)}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <div className="mt-2 text-gray-600">Probando métodos de autenticación...</div>
        </div>
      )}
    </div>
  );
};

export default AuthMethodTester;
