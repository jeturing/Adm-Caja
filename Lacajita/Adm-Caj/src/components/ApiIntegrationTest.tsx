import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const ApiIntegrationTest: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [auth0Users, setAuth0Users] = useState<any[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAuth0Users = async () => {
    if (!isAuthenticated) {
      addTestResult('❌ No autenticado para probar usuarios de Auth0');
      return;
    }

    try {
      addTestResult('Obteniendo usuarios de Auth0...');
      const users = await apiService.getAuth0Users();
      setAuth0Users(users);
      addTestResult(`✅ Usuarios Auth0 obtenidos: ${users.length} usuarios encontrados`);
      if (users.length > 0) {
        addTestResult(`📄 Primer usuario: ${users[0].email} (ID: ${users[0].user_id})`);
      }
    } catch (error) {
      addTestResult(`❌ Error obteniendo usuarios Auth0: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔌 Test de Integración con API</h1>
      
      {/* Estado de Autenticación */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Estado de Autenticación</h2>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm ${
            isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isAuthenticated ? '✅ Autenticado' : '❌ No Autenticado'}
          </span>
          {loading && <span className="text-blue-600">🔄 Cargando...</span>}
        </div>
        {user && (
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Usuario:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.sub}</p>
          </div>
        )}
      </div>

      {/* Botones de Prueba */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Pruebas</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={testAuth0Users}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
            disabled={!isAuthenticated}
          >
            👥 Test Usuarios Auth0
          </button>
        </div>
      </div>

      {/* Resultados de las Pruebas */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Resultados de las Pruebas</h2>
        <div className="bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">No hay resultados aún. Ejecuta una prueba para ver los resultados.</p>
          ) : (
            <ul className="space-y-1">
              {testResults.map((result, index) => (
                <li key={index} className="text-sm font-mono">
                  {result}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Datos Obtenidos */}
      <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-3">Usuarios de Auth0 ({auth0Users.length})</h3>
          <div className="max-h-48 overflow-y-auto">
            {auth0Users.length === 0 ? (
              <p className="text-gray-500 italic">No hay datos disponibles. Ejecuta la prueba de usuarios de Auth0.</p>
            ) : (
              <ul className="space-y-2">
                {auth0Users.map((item, index) => (
                  <li key={item.user_id || index} className="text-sm border-b pb-2">
                    <div><strong>ID:</strong> {item.user_id}</div>
                    <div><strong>Email:</strong> {item.email || 'N/A'}</div>
                    <div><strong>Nombre:</strong> {item.name || 'N/A'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
    </div>
  );
};

export default ApiIntegrationTest;
