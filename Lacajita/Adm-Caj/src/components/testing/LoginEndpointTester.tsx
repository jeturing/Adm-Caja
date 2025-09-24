import { ENV } from '../../config/env';
import React, { useState } from 'react';

interface LoginTestResult {
  method: string;
  payload: any;
  status: number;
  success: boolean;
  response?: any;
  error?: string;
}

const LoginEndpointTester: React.FC = () => {
  const [results, setResults] = useState<LoginTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: 'admin',
    password: 'admin',
    email: 'admin@lacajita.tv'
  });

  // Diferentes formatos de payload para el endpoint /login
  const loginPayloads = [
    {
      name: 'Query Parameters - email/password',
      payload: {
        email: credentials.email,
        password: credentials.password
      },
      method: 'queryParams'
    },
    {
      name: 'Query Parameters - username/password',
      payload: {
        email: credentials.username,
        password: credentials.password
      },
      method: 'queryParams'
    },
    {
      name: 'JSON Body - email/password',
      payload: {
        email: credentials.email,
        password: credentials.password
      },
      method: 'jsonBody'
    },
    {
      name: 'JSON Body - username/password',
      payload: {
        username: credentials.username,
        password: credentials.password
      },
      method: 'jsonBody'
    },
    {
      name: 'Query Params - admin/admin',
      payload: {
        email: 'admin',
        password: 'admin'
      },
      method: 'queryParams'
    },
    {
      name: 'Query Params - test/test123',
      payload: {
        email: 'test@lacajita.tv',
        password: 'test123'
      },
      method: 'queryParams'
    },
    {
      name: 'Form Data - email/password',
      payload: {
        email: credentials.email,
        password: credentials.password
      },
      method: 'formData'
    },
  // Nota: Evitar incluir credenciales de Auth0 en el navegador.
  ];

  const testLoginPayload = async (payloadConfig: any): Promise<LoginTestResult> => {
    try {
      console.log(`🔐 Probando login con ${payloadConfig.name}:`, payloadConfig.payload);
      
      let url = '/api/login';
      let fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      };

      // Configurar según el método especificado
      if (payloadConfig.method === 'queryParams') {
        // Usar query parameters como espera la API Python
        const params = new URLSearchParams(payloadConfig.payload);
        url += `?${params.toString()}`;
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        console.log(`🔗 URL con query params: ${url}`);
      } else if (payloadConfig.method === 'formData') {
        // Usar form data
        const formData = new FormData();
        Object.entries(payloadConfig.payload).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        fetchOptions.body = formData;
      } else {
        // Usar JSON body (método anterior)
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        };
        fetchOptions.body = JSON.stringify(payloadConfig.payload);
      }
      
      const response = await fetch(url, fetchOptions);

      let responseData = null;
      const responseText = await response.text();
      
      try {
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (e) {
        // Si no es JSON, guardar como texto
        responseData = responseText;
      }

      const result: LoginTestResult = {
        method: payloadConfig.name,
        payload: payloadConfig.payload,
        status: response.status,
        success: response.ok,
        response: responseData
      };

      if (response.ok) {
        console.log(`✅ LOGIN EXITOSO: ${payloadConfig.name} - Status: ${response.status}`);
        console.log('🎉 Respuesta:', responseData);
        console.log('🔑 Token encontrado:', responseData?.access_token || responseData?.token);
      } else if (response.status === 422) {
        console.log(`⚠️ Formato incorrecto: ${payloadConfig.name} - necesita otros campos`);
        console.log('📄 Respuesta 422:', responseData);
      } else {
        result.error = `HTTP ${response.status}: ${responseText}`;
        console.log(`❌ Error ${response.status} en ${payloadConfig.name}:`, responseText);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error en ${payloadConfig.name}:`, error);
      return {
        method: payloadConfig.name,
        payload: payloadConfig.payload,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  const runAllLoginTests = async () => {
    setIsLoading(true);
    setResults([]);
    
    console.log('🚀 Iniciando pruebas del endpoint /login...');
    
    const allResults: LoginTestResult[] = [];
    
    for (const payloadConfig of loginPayloads) {
      const result = await testLoginPayload(payloadConfig);
      allResults.push(result);
      setResults(prev => [...prev, result]);
      
      // Pausa pequeña
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsLoading(false);
    
    const successCount = allResults.filter(r => r.success).length;
    const format422Count = allResults.filter(r => r.status === 422).length;
    
    console.log(`📊 Pruebas de login completadas:`);
    console.log(`   ✅ Exitosos: ${successCount}/${allResults.length}`);
    console.log(`   ⚠️ Formato incorrecto (422): ${format422Count}/${allResults.length}`);
    
    if (successCount > 0) {
      console.log('🎉 ¡MÉTODO DE LOGIN ENCONTRADO!');
      allResults.filter(r => r.success).forEach(result => {
        console.log(`✅ ${result.method} - Token:`, result.response);
      });
    }
  };

  const testCustomCredentials = async () => {
    const customPayload = {
      name: 'Credenciales Personalizadas - Query Params',
      payload: {
        email: credentials.email,
        password: credentials.password
      },
      method: 'queryParams'
    };

    const result = await testLoginPayload(customPayload);
    setResults(prev => [result, ...prev]);
  };

  const getStatusBadge = (result: LoginTestResult) => {
    if (result.success) {
      return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">✅ {result.status}</span>;
    }
    if (result.status === 422) {
      return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">⚠️ {result.status}</span>;
    }
    if (result.status === 401) {
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">🔒 {result.status}</span>;
    }
    return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">❌ {result.status}</span>;
  };

  const successfulResults = results.filter(r => r.success);
  const format422Results = results.filter(r => r.status === 422);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          🔐 Pruebas Específicas del Endpoint /login
        </h3>
        <button
          onClick={runAllLoginTests}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Probar Todos los Formatos'}
        </button>
      </div>

      {/* Formulario de credenciales personalizadas */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">🔑 Credenciales Personalizadas</h4>
        <div className="grid grid-cols-3 gap-4">
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
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials(prev => ({...prev, email: e.target.value}))}
            className="px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={testCustomCredentials}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔐 Probar Credenciales
        </button>
      </div>

      {/* Resultados exitosos */}
      {successfulResults.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">🎉 ¡LOGIN EXITOSO ENCONTRADO!</h4>
          {successfulResults.map((result, index) => (
            <div key={index} className="mb-3 p-3 bg-white rounded border border-green-200">
              <div className="font-medium text-green-700">
                ✅ {result.method}
              </div>
              <div className="text-sm text-green-600 mt-1">
                Status: {result.status}
              </div>
              <div className="text-xs text-gray-700 mt-2">
                <strong>Payload enviado:</strong> {JSON.stringify(result.payload, null, 2)}
              </div>
              <div className="text-xs text-gray-700 mt-2">
                <strong>Respuesta:</strong> {JSON.stringify(result.response, null, 2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resultados 422 (formato incorrecto) */}
      {format422Results.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded">
          <h4 className="font-semibold text-orange-800 mb-2">⚠️ Formatos que necesitan ajustes (422):</h4>
          <div className="text-sm text-orange-700 mb-2">
            Estos formatos llegaron al endpoint pero necesitan campos adicionales o diferentes
          </div>
          {format422Results.map((result, index) => (
            <div key={index} className="mb-2 p-2 bg-white rounded border border-orange-200">
              <div className="font-medium text-orange-700">
                ⚠️ {result.method} - Necesita ajustes
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Payload: {JSON.stringify(result.payload)}
              </div>
              {result.response && (
                <div className="text-xs text-gray-600 mt-1">
                  Respuesta: {JSON.stringify(result.response)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded">
          <div className="text-2xl font-bold text-gray-700">{results.length}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
        <div className="text-center p-3 bg-green-100 rounded">
          <div className="text-2xl font-bold text-green-600">{successfulResults.length}</div>
          <div className="text-sm text-green-600">Exitosos</div>
        </div>
        <div className="text-center p-3 bg-orange-100 rounded">
          <div className="text-2xl font-bold text-orange-600">{format422Results.length}</div>
          <div className="text-sm text-orange-600">422 Formato</div>
        </div>
        <div className="text-center p-3 bg-red-100 rounded">
          <div className="text-2xl font-bold text-red-600">{results.filter(r => r.status === 401).length}</div>
          <div className="text-sm text-red-600">401 Auth</div>
        </div>
      </div>

      {/* Lista de resultados */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 border rounded ${
              result.success ? 'bg-green-50 border-green-200' : 
              result.status === 422 ? 'bg-orange-50 border-orange-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {result.method}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {JSON.stringify(result.payload)}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600 mt-1">{result.error}</div>
                )}
                {result.response && (
                  <div className="text-xs text-gray-500 mt-1">
                    Respuesta: {JSON.stringify(result.response).substring(0, 100)}...
                  </div>
                )}
              </div>
              <div className="ml-4">
                {getStatusBadge(result)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <div className="mt-2 text-gray-600">Probando formatos de login...</div>
        </div>
      )}
    </div>
  );
};

export default LoginEndpointTester;
