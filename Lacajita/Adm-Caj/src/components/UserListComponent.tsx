import React, { useState, useEffect } from 'react';
import { localDB, LocalUser } from '../services/localDB';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

interface Auth0User {
  user_id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  connection?: string;
  username?: string;
  nickname?: string;
  name?: string;
}

const UserListComponent: React.FC = () => {
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([]);
  const [auth0Users, setAuth0Users] = useState<Auth0User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'local' | 'auth0'>('local');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadAllUsers();
  }, [isAuthenticated]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      // Cargar usuarios locales
      const allUsers = await localDB.getAllUsers();
      setLocalUsers(allUsers);

      // Cargar usuarios de Auth0 si tenemos token
      if (isAuthenticated) {
        try {
          const auth0UsersList = await apiService.getAuth0Users();
          setAuth0Users(auth0UsersList);
        } catch (error) {
          console.error('Error loading Auth0 users:', error);
          setAuth0Users([]);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLocalUser = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario local?')) {
      try {
        await localDB.deleteUser(id);
        await loadAllUsers(); // Recargar lista
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  if (loading) {
    return <div className="p-6">Cargando usuarios...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">👥 Gestión de Usuarios</h1>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('local')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💾 Usuarios Locales ({localUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('auth0')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'auth0'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔐 Usuarios Auth0 ({auth0Users.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Usuarios Locales */}
      {activeTab === 'local' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {localUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No hay usuarios registrados localmente</p>
              <a href="/signup" className="text-blue-500 hover:text-blue-600 mt-2 inline-block">
                ➕ Registrar primer usuario
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Local
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Prefix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.emailPrefix}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.phone || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteLocalUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Usuarios Auth0 */}
      {activeTab === 'auth0' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {!isAuthenticated ? (
            <div className="p-8 text-center text-gray-500">
              <p>🔐 Necesitas autenticarte para ver los usuarios de Auth0</p>
              <a href="/signin" className="text-blue-500 hover:text-blue-600 mt-2 inline-block">
                ➡️ Ir a Login
              </a>
            </div>
          ) : auth0Users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No hay usuarios en Auth0 o no se pudieron cargar</p>
              <button
                onClick={loadAllUsers}
                className="text-blue-500 hover:text-blue-600 mt-2 inline-block"
              >
                🔄 Recargar
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verificado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conexión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auth0Users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {user.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        {user.name && (
                          <div className="text-sm text-gray-500">{user.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email_verified ? (
                          <span className="text-green-600">✅ Verificado</span>
                        ) : (
                          <span className="text-red-600">❌ No verificado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.connection || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Información del Sistema Híbrido</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Datos sensibles</strong> (email, password) se envían a Auth0 API</li>
          <li>• <strong>Datos personales</strong> (nombre, teléfono) se guardan localmente</li>
          <li>• <strong>Asociación</strong> mediante ID local + prefijo del email</li>
          <li>• Si la API falla, los datos se guardan solo localmente</li>
        </ul>
      </div>

      <div className="mt-4 flex gap-4">
        <button
          onClick={loadAllUsers}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          🔄 Recargar Todo
        </button>
        <a
          href="/api-test"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          🧪 Probar API
        </a>
        <a
          href="/signup"
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          ➕ Nuevo Usuario
        </a>
      </div>
    </div>
  );
};

export default UserListComponent;
