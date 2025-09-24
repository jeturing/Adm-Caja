import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useAuth0 } from '@auth0/auth0-react';
import { ENV } from '../../config/env';
import SentryTestButton from '../testing/SentryTestButton';
import UserPermissionsManager from './UserPermissionsManager';

interface SecurityConfig {
  auth0: {
    domain: string;
    clientId: string;
    clientSecret: string;
    audience: string;
    redirectUri: string;
    status: 'connected' | 'disconnected' | 'testing';
  };
  api: {
    baseUrl: string;
    clientSecret: string;
    health: 'healthy' | 'unhealthy' | 'testing';
  };
  sentry: {
    dsn: string;
    environment: string;
    status: 'active' | 'inactive' | 'testing';
  };
  security: {
    isHttps: boolean;
    corsEnabled: boolean;
    devMode: boolean;
    sslBypass: boolean;
  };
  database: {
    host: string;
    status: 'connected' | 'disconnected' | 'unknown';
  };
}

const SecurityConfigurationMenu: React.FC = () => {
  const { isAuthenticated, user } = useAuth0();
  const [activeSection, setActiveSection] = useState<'config' | 'permissions'>('config');
  const [config, setConfig] = useState<SecurityConfig>({
    auth0: {
      domain: ENV.AUTH0_DOMAIN,
      clientId: ENV.AUTH0_CLIENT_ID,
      clientSecret: ENV.AUTH0_CLIENT_SECRET || '[Hidden]',
      audience: import.meta.env.VITE_AUTH0_AUDIENCE || '',
      redirectUri: ENV.AUTH0_REDIRECT_URI,
      status: 'testing'
    },
    api: {
      baseUrl: ENV.API_BASE_URL,
      clientSecret: ENV.CLIENT_SECRET || '[Hidden]',
      health: 'testing'
    },
    sentry: {
      dsn: import.meta.env.VITE_SENTRY_DSN || '[Not configured]',
      environment: import.meta.env.MODE || 'development',
      status: 'testing'
    },
    security: {
      isHttps: window.location.protocol === 'https:',
      corsEnabled: true,
      devMode: import.meta.env.DEV || false,
      sslBypass: import.meta.env.VITE_SSL_BYPASS || false
    },
    database: {
      host: import.meta.env.VITE_DB_HOST || 'Remote Server',
      status: 'unknown'
    }
  });

  const [isChecking, setIsChecking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkAuth0Status = async () => {
    addLog('🔍 Verificando conectividad Auth0...');
    try {
      const response = await fetch(`https://${config.auth0.domain}/.well-known/openid_configuration`);
      const status = response.ok ? 'connected' : 'disconnected';
      setConfig(prev => ({
        ...prev,
        auth0: { ...prev.auth0, status }
      }));
      addLog(`✅ Auth0 Status: ${status}`);
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        auth0: { ...prev.auth0, status: 'disconnected' }
      }));
      addLog(`❌ Auth0 Error: ${error}`);
    }
  };

  const checkApiHealth = async () => {
    addLog('🔍 Verificando salud de la API...');
    try {
      const baseUrl = import.meta.env.DEV ? '/api' : config.api.baseUrl;
      const response = await fetch(`${baseUrl}/health`);
      const status = response.ok ? 'healthy' : 'unhealthy';
      setConfig(prev => ({
        ...prev,
        api: { ...prev.api, health: status }
      }));
      addLog(`✅ API Health: ${status}`);
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        api: { ...prev.api, health: 'unhealthy' }
      }));
      addLog(`❌ API Error: ${error}`);
    }
  };

  const checkSentryStatus = () => {
    addLog('🔍 Verificando configuración de Sentry...');
    try {
      // Test Sentry connection by sending a test message
      Sentry.addBreadcrumb({
        message: 'Security Configuration Check',
        level: 'info',
        category: 'security'
      });
      
      const status = config.sentry.dsn !== '[Not configured]' ? 'active' : 'inactive';
      setConfig(prev => ({
        ...prev,
        sentry: { ...prev.sentry, status }
      }));
      addLog(`✅ Sentry Status: ${status}`);
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        sentry: { ...prev.sentry, status: 'inactive' }
      }));
      addLog(`❌ Sentry Error: ${error}`);
    }
  };

  const runFullSecurityCheck = async () => {
    setIsChecking(true);
    setLogs([]);
    addLog('🔒 Iniciando verificación completa de seguridad...');
    
    await checkAuth0Status();
    await checkApiHealth();
    checkSentryStatus();
    
    addLog('✅ Verificación de seguridad completada');
    setIsChecking(false);
  };

  const exportConfiguration = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      config,
      user: user ? { email: user.email, name: user.name } : null,
      environment: import.meta.env.MODE,
      logs
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lacajita-security-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('💾 Configuración exportada exitosamente');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'active':
        return '🟢';
      case 'disconnected':
      case 'unhealthy':
      case 'inactive':
        return '🔴';
      case 'testing':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'active':
        return 'text-green-600';
      case 'disconnected':
      case 'unhealthy':
      case 'inactive':
        return 'text-red-600';
      case 'testing':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  useEffect(() => {
    runFullSecurityCheck();
    
    // Sincronizar usuario con Auth0 si está autenticado
    if (isAuthenticated && user) {
      // Auto-sync con Auth0 Management cuando el usuario se autentica
      console.log('Usuario autenticado:', user.email);
    }
  }, [isAuthenticated, user]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🔒 Configuración de Seguridad
            </h1>
            <p className="text-gray-600">
              Panel de administración y monitoreo de seguridad para La Cajita TV
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runFullSecurityCheck}
              disabled={isChecking}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isChecking ? '🔄 Verificando...' : '🔍 Verificar Todo'}
            </button>
            <button
              onClick={exportConfiguration}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              💾 Exportar Config
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveSection('config')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'config'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            🛡️ Configuración de Seguridad
          </button>
          <button
            onClick={() => setActiveSection('permissions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === 'permissions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            👥 Gestión de Permisos
          </button>
        </div>
      </div>

      {/* Content */}
      {activeSection === 'config' ? (
        <div className="space-y-6">
          {/* Auth0 Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">🔐 Auth0 Authentication</h2>
              <span className={`text-sm font-medium ${getStatusColor(config.auth0.status)}`}>
                {getStatusIcon(config.auth0.status)} {config.auth0.status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Domain</label>
                  <input
                    type="text"
                    value={config.auth0.domain}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    value={config.auth0.clientId}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Audience</label>
                  <input
                    type="text"
                    value={config.auth0.audience}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redirect URI</label>
                  <input
                    type="text"
                    value={config.auth0.redirectUri}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <input
                    type="password"
                    value={config.auth0.clientSecret}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={checkAuth0Status}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors"
                  >
                    🔍 Test Auth0 Connection
                  </button>
                </div>
              </div>
            </div>

            {/* Auth0 Status */}
            {isAuthenticated && user && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800">✅ Usuario Autenticado</h4>
                <p className="text-sm text-green-700">Email: {user.email}</p>
                <p className="text-sm text-green-700">Nombre: {user.name}</p>
              </div>
            )}
          </div>

          {/* API Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">🌐 API Configuration</h2>
              <span className={`text-sm font-medium ${getStatusColor(config.api.health)}`}>
                {getStatusIcon(config.api.health)} {config.api.health.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Base URL</label>
                <input
                  type="text"
                  value={config.api.baseUrl}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                <input
                  type="password"
                  value={config.api.clientSecret}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={checkApiHealth}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm transition-colors"
              >
                🏥 Check API Health
              </button>
            </div>
          </div>

          {/* Sentry Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">📊 Sentry Monitoring</h2>
              <span className={`text-sm font-medium ${getStatusColor(config.sentry.status)}`}>
                {getStatusIcon(config.sentry.status)} {config.sentry.status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">DSN</label>
                <input
                  type="password"
                  value={config.sentry.dsn}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Environment</label>
                <input
                  type="text"
                  value={config.sentry.environment}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <SentryTestButton />
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🛡️ Security Settings</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">{config.security.isHttps ? '🔒' : '🔓'}</div>
                <div className="font-medium">HTTPS</div>
                <div className={`text-sm ${config.security.isHttps ? 'text-green-600' : 'text-red-600'}`}>
                  {config.security.isHttps ? 'Secure' : 'Insecure'}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">{config.security.devMode ? '🛠️' : '🏭'}</div>
                <div className="font-medium">Mode</div>
                <div className={`text-sm ${config.security.devMode ? 'text-yellow-600' : 'text-green-600'}`}>
                  {config.security.devMode ? 'Development' : 'Production'}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">{config.security.corsEnabled ? '✅' : '❌'}</div>
                <div className="font-medium">CORS</div>
                <div className={`text-sm ${config.security.corsEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {config.security.corsEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">{config.security.sslBypass ? '⚠️' : '🔐'}</div>
                <div className="font-medium">SSL</div>
                <div className={`text-sm ${config.security.sslBypass ? 'text-yellow-600' : 'text-green-600'}`}>
                  {config.security.sslBypass ? 'Bypassed' : 'Verified'}
                </div>
              </div>
            </div>
          </div>

          {/* Database Configuration */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">🗄️ Database</h2>
              <span className={`text-sm font-medium ${getStatusColor(config.database.status)}`}>
                {getStatusIcon(config.database.status)} {config.database.status.toUpperCase()}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Host</label>
              <input
                type="text"
                value={config.database.host}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
            </div>
          </div>

          {/* Security Logs */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📝 Security Logs</h2>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs available...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
              >
                🗑️ Clear Logs
              </button>
              <button
                onClick={() => addLog(`💡 Manual log entry at ${new Date().toLocaleTimeString()}`)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                ➕ Add Test Log
              </button>
            </div>
          </div>

          {/* Environment Variables Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Environment Variables</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify({
                  MODE: import.meta.env.MODE,
                  DEV: import.meta.env.DEV,
                  PROD: import.meta.env.PROD,
                  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
                  VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
                  VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
                  VITE_JWPLAYER_CDN_URL: import.meta.env.VITE_JWPLAYER_CDN_URL,
                  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ? '[CONFIGURED]' : '[NOT SET]'
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <UserPermissionsManager 
          onUserUpdated={(updatedUser) => {
            addLog(`✅ Usuario actualizado: ${updatedUser.name}`);
          }}
        />
      )}
    </div>
  );
};

export default SecurityConfigurationMenu;
