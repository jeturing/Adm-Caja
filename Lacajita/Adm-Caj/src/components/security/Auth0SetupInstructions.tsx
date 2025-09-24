import React from 'react';

const Auth0SetupInstructions: React.FC = () => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100">
            <span className="text-yellow-600 font-bold">⚠️</span>
          </div>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">
            Configuración requerida: Auth0 Management API
          </h3>
          
          <div className="text-sm text-yellow-700 space-y-4">
            <p className="font-medium">Para habilitar la gestión de usuarios y permisos, necesitas configurar una aplicación Machine to Machine en Auth0:</p>
            
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Ve al <a href="https://manage.auth0.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Auth0 Dashboard</a></li>
              <li>Navega a <strong>Applications</strong></li>
              <li>Haz clic en <strong>Create Application</strong></li>
              <li>Elige un nombre (ej: "La Cajita Management")</li>
              <li>Selecciona <strong>Machine to Machine Applications</strong></li>
              <li>Autoriza la <strong>Auth0 Management API</strong></li>
              <li>Selecciona los siguientes scopes:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li><code>read:users</code></li>
                  <li><code>update:users</code></li>
                  <li><code>create:users</code></li>
                  <li><code>delete:users</code></li>
                  <li><code>read:roles</code></li>
                  <li><code>update:roles</code></li>
                  <li><code>create:roles</code></li>
                  <li><code>delete:roles</code></li>
                  <li><code>read:user_idp_tokens</code></li>
                  <li><code>update:users_app_metadata</code></li>
                </ul>
              </li>
              <li>Copia el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
              <li>Actualiza tu archivo <code>.env</code> con:
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                  VITE_AUTH0_M2M_CLIENT_ID=tu_client_id<br/>
                  VITE_AUTH0_M2M_CLIENT_SECRET=tu_client_secret
                </div>
              </li>
              <li>Reinicia el servidor de desarrollo</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-blue-800 font-medium">📋 Configuración actual:</p>
              <div className="mt-2 text-xs font-mono">
                <div>Domain: <span className="text-green-600">{import.meta.env.VITE_AUTH0_DOMAIN || '❌ No configurado'}</span></div>
                <div>M2M Client ID: <span className="text-green-600">{import.meta.env.VITE_AUTH0_M2M_CLIENT_ID ? '✅ Configurado' : '❌ No configurado'}</span></div>
                <div>M2M Client Secret: <span className="text-green-600">{import.meta.env.VITE_AUTH0_M2M_CLIENT_SECRET ? '✅ Configurado' : '❌ No configurado'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth0SetupInstructions;
