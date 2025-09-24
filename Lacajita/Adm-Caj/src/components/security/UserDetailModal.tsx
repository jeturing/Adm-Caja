import React, { useState, useEffect } from 'react';
import { Auth0User } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Auth0User;
  onUserUpdated?: (user: Auth0User) => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onUserUpdated 
}) => {
  const [loading, setLoading] = useState(false);
  const [loginInfo, setLoginInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'logs' | 'metadata'>('basic');

  useEffect(() => {
    if (isOpen && user) {
      loadAdditionalData();
    }
  }, [isOpen, user]);

  const loadAdditionalData = async () => {
    setLoading(true);
    try {
      const [loginData, logsData] = await Promise.all([
        auth0ManagementService.getUserLastLoginInfo(user.user_id),
        auth0ManagementService.getUserLogs(user.user_id)
      ]);
      
      setLoginInfo(loginData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading additional user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sendVerificationEmail = async () => {
    try {
      setLoading(true);
      await auth0ManagementService.sendVerificationEmail(user.user_id);
      alert('Email de verificación enviado correctamente');
    } catch (error) {
      alert('Error enviando email de verificación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl text-gray-600">
                  {user.name?.charAt(0) || user.email.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.email_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.email_verified ? '✅ Verificado' : '❌ No verificado'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    🔢 {user.logins_count} logins
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: '👤 Básico', icon: '👤' },
              { id: 'security', label: '🔒 Seguridad', icon: '🔒' },
              { id: 'logs', label: '📊 Logs', icon: '📊' },
              { id: 'metadata', label: '⚙️ Metadata', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Información Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">📋 Información Personal</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID de Usuario</label>
                      <input 
                        type="text" 
                        value={user.user_id} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          value={user.email} 
                          readOnly 
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                        />
                        {!user.email_verified && (
                          <button
                            onClick={sendVerificationEmail}
                            disabled={loading}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-400"
                          >
                            📧 Verificar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre</label>
                      <input 
                        type="text" 
                        value={user.name || ''} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nickname</label>
                      <input 
                        type="text" 
                        value={user.nickname || 'No establecido'} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                      />
                    </div>
                    
                    {user.phone_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                        <input 
                          type="text" 
                          value={user.phone_number} 
                          readOnly 
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">📅 Fechas Importantes</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cuenta Creada</label>
                      <input 
                        type="text" 
                        value={formatDate(user.created_at)} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Última Actualización</label>
                      <input 
                        type="text" 
                        value={formatDate(user.updated_at)} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Último Login</label>
                      <input 
                        type="text" 
                        value={formatDate(user.last_login)} 
                        readOnly 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Información de Seguridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">🔐 Información de Acceso</h3>
                  
                  <div className="space-y-3">
                    {loginInfo?.last_ip && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Última IP</label>
                        <input 
                          type="text" 
                          value={loginInfo.last_ip} 
                          readOnly 
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded font-mono"
                        />
                      </div>
                    )}
                    
                    {loginInfo?.location && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                        <input 
                          type="text" 
                          value={loginInfo.location} 
                          readOnly 
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                    
                    {loginInfo?.browser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Navegador</label>
                        <input 
                          type="text" 
                          value={loginInfo.browser} 
                          readOnly 
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">🔑 Identidades</h3>
                  
                  {user.identities && user.identities.length > 0 ? (
                    <div className="space-y-2">
                      {user.identities.map((identity, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="text-sm">
                            <div><strong>Proveedor:</strong> {identity.provider}</div>
                            <div><strong>Conexión:</strong> {identity.connection}</div>
                            <div><strong>Social:</strong> {identity.isSocial ? 'Sí' : 'No'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No hay identidades configuradas</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">📊 Logs de Actividad</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="spinner"></div>
                  <p>Cargando logs...</p>
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.type === 's' ? 'bg-green-100 text-green-800' :
                          log.type === 'f' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.type === 's' ? '✅ Login exitoso' :
                           log.type === 'f' ? '❌ Login fallido' :
                           log.type}
                        </span>
                        <span className="text-gray-500">{formatDate(log.date)}</span>
                      </div>
                      
                      {log.ip && (
                        <div><strong>IP:</strong> {log.ip}</div>
                      )}
                      
                      {log.location_info && (
                        <div><strong>Ubicación:</strong> {log.location_info.city_name}, {log.location_info.country_name}</div>
                      )}
                      
                      {log.user_agent && (
                        <div className="mt-1">
                          <strong>User Agent:</strong>
                          <div className="text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded mt-1">
                            {log.user_agent}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay logs disponibles</p>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* App Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 App Metadata</h3>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(user.app_metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* User Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">👤 User Metadata</h3>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(user.user_metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
