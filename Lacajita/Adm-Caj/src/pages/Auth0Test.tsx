import React from 'react';
import { ENV } from '../config/env';
import { Auth0LoginButton, Auth0LogoutButton, Auth0UserProfile } from '../components/auth/Auth0Components';
import { useAuth0Integration } from '../hooks/useAuth0Integration';

export const Auth0TestPage: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    error,
    token,
    apiUser,
    testApiCall,
    userEmail,
    userName
  } = useAuth0Integration();

  const [apiTest, setApiTest] = React.useState<string>('');
  const [testing, setTesting] = React.useState(false);

  const testApiWithToken = async () => {
    setTesting(true);
    setApiTest('🔄 Probando API con token de Auth0...');
    
    try {
      const userData = await testApiCall();
      setApiTest(`✅ API funcionando correctamente:\n${JSON.stringify(userData, null, 2)}`);
    } catch (error) {
      setApiTest(`❌ Error: ${error instanceof Error ? error.message : error}`);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando Auth0...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error de Autenticación</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <strong>Debug Info:</strong><br/>
            Domain: {ENV.AUTH0_DOMAIN}<br/>
            Client ID: {ENV.AUTH0_CLIENT_ID || '(no configurado)'}<br/>
            Redirect URI: {ENV.AUTH0_REDIRECT_URI || window.location.origin}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Prueba de Auth0 - Authorization Code Flow</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estado de Autenticación */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Estado de Autenticación</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p><strong>Autenticado:</strong> {isAuthenticated ? '✅ Sí' : '❌ No'}</p>
                <p><strong>Cargando:</strong> {isLoading ? '⏳ Sí' : '✅ No'}</p>
                <p><strong>Error:</strong> {error ? `❌ ${error}` : '✅ Ninguno'}</p>
                {isAuthenticated && (
                  <>
                    <p><strong>Email:</strong> {userEmail || 'No disponible'}</p>
                    <p><strong>Nombre:</strong> {userName || 'No disponible'}</p>
                    <p><strong>Token:</strong> {token ? '✅ Disponible' : '❌ No disponible'}</p>
                    <p><strong>API User:</strong> {apiUser ? '✅ Cargado' : '⏳ Cargando...'}</p>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                {!isAuthenticated && <Auth0LoginButton />}
                {isAuthenticated && <Auth0LogoutButton />}
              </div>
            </div>

            {/* Prueba de API */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Prueba de API</h2>
              {isAuthenticated && (
                <div className="space-y-2">
                  <button
                    onClick={testApiWithToken}
                    disabled={testing}
                    className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                      testing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {testing ? 'Probando...' : 'Probar API con Token'}
                  </button>
                  
                  {apiTest && (
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <pre className="whitespace-pre-wrap">{apiTest}</pre>
                    </div>
                  )}
                </div>
              )}
              {!isAuthenticated && (
                <p className="text-gray-500">Inicia sesión para probar la API</p>
              )}
            </div>
          </div>
        </div>

        {/* Perfil de Usuario */}
        {isAuthenticated && (
          <div className="mb-6">
            <Auth0UserProfile />
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-blue-800 font-semibold mb-2">Información del Flujo</h3>
          <div className="text-blue-700 space-y-1">
            <p>• <strong>Tipo:</strong> Authorization Code Flow</p>
            <p>• <strong>Dominio:</strong> {ENV.AUTH0_DOMAIN}</p>
            <p>• <strong>Client ID:</strong> {ENV.AUTH0_CLIENT_ID || '(no configurado)'}</p>
            <p>• <strong>Audience:</strong> https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us/</p>
            <p>• <strong>Scopes:</strong> openid profile email</p>
          </div>
        </div>
      </div>
    </div>
  );
};
