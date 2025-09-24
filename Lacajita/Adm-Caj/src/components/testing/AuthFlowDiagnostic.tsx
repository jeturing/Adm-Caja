/**
 * Componente de diagnóstico rápido del flujo de autenticación
 * Verifica Auth0 → Token API → Acceso a recursos
 */

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authService } from '../../services/authService';
import { authFlowService } from '../../services/authFlowService';
import { realApiService } from '../../services/realApiService';

const AuthFlowDiagnostic: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const [diagnosticResults, setDiagnosticResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [flowState, setFlowState] = useState<any>(null);

  // Suscribirse a cambios en authFlowService
  useEffect(() => {
    const unsubscribe = authFlowService.subscribe((state) => {
      setFlowState(state);
    });

    // Obtener estado inicial
    setFlowState(authFlowService.getState());

    return unsubscribe;
  }, []);

  const addResult = (test: string, success: boolean, details?: any, error?: string) => {
    const result = {
      test,
      success,
      details,
      error,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setDiagnosticResults(prev => [...prev, result]);
    console.log(`${success ? '✅' : '❌'} ${test}:`, details || error);
  };

  const runCompleteDiagnostic = async () => {
    setIsRunning(true);
    setDiagnosticResults([]);
    
    try {
      console.log('🚀 Iniciando diagnóstico completo del flujo de autenticación...');

      // 1. Verificar estado Auth0
      addResult(
        'Auth0 Authentication Status',
        isAuthenticated,
        { isAuthenticated, isLoading, userEmail: user?.email },
        !isAuthenticated ? 'Usuario no autenticado con Auth0' : undefined
      );

      // 2. Verificar authFlowService state
      const currentState = authFlowService.getState();
      addResult(
        'AuthFlow Service State',
        true,
        currentState
      );

      // 3. Obtener token de API
      try {
        const token = await authService.getToken();
        const tokenInfo = authService.getTokenInfo();
        addResult(
          'API Token Generation',
          !!token,
          { tokenType: tokenInfo.type, hasToken: !!token, expiresAt: tokenInfo.expiresAt },
          !token ? 'No se pudo obtener token' : undefined
        );
      } catch (error) {
        addResult('API Token Generation', false, null, `Error: ${error}`);
      }

      // 4. Probar getUserInfo
      try {
        const userInfo = await authService.getUserInfo();
        addResult(
          'User Info Retrieval',
          !!userInfo,
          userInfo
        );
      } catch (error) {
        addResult('User Info Retrieval', false, null, `Error: ${error}`);
      }

      // 5. Probar health check de API
      try {
        const health = await realApiService.checkHealth();
        addResult(
          'API Health Check',
          !!health,
          health
        );
      } catch (error) {
        addResult('API Health Check', false, null, `Error: ${error}`);
      }

      // 6. Probar acceso a playlists (autenticado)
      try {
        const playlists = await realApiService.getCompletePlaylistData();
        addResult(
          'Authenticated API Access (Playlists)',
          !!playlists,
          { playlistCount: playlists?.segments?.length || 0 }
        );
      } catch (error) {
        addResult('Authenticated API Access (Playlists)', false, null, `Error: ${error}`);
      }

      // 7. Verificar AuthFlowService después de las pruebas
      const finalState = authFlowService.getState();
      addResult(
        'Final AuthFlow State',
        true,
        finalState
      );

    } catch (error) {
      addResult('Complete Diagnostic', false, null, `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setDiagnosticResults([]);
  };

  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';
  const getStatusColor = (success: boolean) => success ? 'text-green-600' : 'text-red-600';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          🔍 Diagnóstico del Flujo de Autenticación
        </h2>

        {/* Estado actual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Auth0 Status</h3>
            <div className="text-sm text-blue-700">
              <div>Autenticado: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Usuario: {user?.email || 'N/A'}</div>
              <div>Cargando: {isLoading ? 'Sí' : 'No'}</div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">AuthFlow State</h3>
            <div className="text-sm text-green-700">
              <div>Auth0: {flowState?.isAuth0Authenticated ? '✅' : '❌'}</div>
              <div>API Token: {flowState?.hasApiToken ? '✅' : '❌'}</div>
              <div>Token Válido: {flowState?.apiTokenValid ? '✅' : '❌'}</div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">API Status</h3>
            <div className="text-sm text-purple-700">
              <div>Token Type: {authService.getTokenInfo().type || 'N/A'}</div>
              <div>Tests Run: {diagnosticResults.length}</div>
              <div>Success Rate: {diagnosticResults.length > 0 ? Math.round((diagnosticResults.filter(r => r.success).length / diagnosticResults.length) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runCompleteDiagnostic}
            disabled={isRunning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '🔄 Ejecutando...' : '🚀 Ejecutar Diagnóstico Completo'}
          </button>
          
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            🗑️ Limpiar
          </button>
        </div>

        {/* Resultados del diagnóstico */}
        {diagnosticResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resultados del Diagnóstico</h3>
            <div className="space-y-2">
              {diagnosticResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">
                        {getStatusIcon(result.success)}
                      </span>
                      <h4 className={`font-medium ${getStatusColor(result.success)}`}>
                        {result.test}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-500">
                      {result.timestamp}
                    </span>
                  </div>
                  
                  {result.details && (
                    <div className="mt-2">
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">📋 Cómo usar este diagnóstico</h3>
          <div className="text-sm text-yellow-800 space-y-1">
            <div>• Este componente verifica todo el flujo: Auth0 → Token API → Acceso a recursos</div>
            <div>• Ejecuta el diagnóstico después de hacer login con Auth0</div>
            <div>• Todos los pasos deben ser ✅ para que el sistema funcione correctamente</div>
            <div>• Si algo falla, revisa los detalles del error para identificar el problema</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthFlowDiagnostic;
