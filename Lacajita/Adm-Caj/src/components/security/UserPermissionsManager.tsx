import React, { useState, useEffect } from 'react';
import { User, Auth0Role, SIDEBAR_MENUS, MASTER_ACCOUNT_EMAIL } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';
import { useAuth0 } from '@auth0/auth0-react';
import Auth0SetupInstructions from './Auth0SetupInstructions';
import CreateUserModal from './CreateUserModal';
import UserDetailModal from './UserDetailModal';
import CreateRoleModal from './CreateRoleModal';
import RolePermissionsModal from './RolePermissionsModal';
import AssignRolesModal from './AssignRolesModal';
import SecurityDashboard from './SecurityDashboard';
import ExportConfigModal from './ExportConfigModal';
import { RoleInitializer } from './RoleInitializer';
import { WorkflowManager } from './WorkflowManager';
import { RoleTestingManager } from './RoleTestingManager';
import { InitialConfigExporter } from './InitialConfigExporter';
import { PermissionTestingPanel } from './PermissionTestingPanel';

interface UserPermissionsManagerProps {
  onUserUpdated?: (user: User) => void;
}

const UserPermissionsManager: React.FC<UserPermissionsManagerProps> = ({ onUserUpdated }) => {
  const { user: currentUser } = useAuth0();
  const [users, setUsers] = useState<User[]>([]);
  const [auth0Roles, setAuth0Roles] = useState<Auth0Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'roles' | 'permissions' | 'setup'>('dashboard');
  const [isAuth0Configured, setIsAuth0Configured] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any>(null);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Auth0Role | null>(null);
  const [showAssignRolesModal, setShowAssignRolesModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Verificar configuración de Auth0 M2M
  useEffect(() => {
    const m2mClientId = import.meta.env.VITE_AUTH0_M2M_CLIENT_ID;
    const m2mClientSecret = import.meta.env.VITE_AUTH0_M2M_CLIENT_SECRET;
    setIsAuth0Configured(!!(m2mClientId && m2mClientSecret && m2mClientId !== 'TU_M2M_CLIENT_ID_AQUI'));
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuth0Configured) {
      loadData();
    }
  }, [isAuth0Configured]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, rolesData] = await Promise.all([
        auth0ManagementService.getAllSyncedUsers(),
        auth0ManagementService.getRoles()
      ]);

      setUsers(usersData);
      setAuth0Roles(rolesData);
    } catch (err) {
      console.error('Error loading permission data:', err);
      setError(err instanceof Error ? err.message : 'Error cargando datos de permisos');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la creación de usuarios
  const handleUserCreated = async (newUser: any) => {
    try {
      await loadData();
      onUserUpdated && onUserUpdated(newUser);
    } catch (error) {
      console.error('Error refreshing user list after creation:', error);
    }
  };

  // Función para mostrar detalles del usuario
  const handleShowUserDetails = async (user: User) => {
    try {
      setLoading(true);
      const fullAuth0User = await auth0ManagementService.getUser(user.auth0Id || user.id);
      setSelectedUserForDetail(fullAuth0User);
      setShowUserDetailModal(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Error cargando detalles del usuario');
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar usuario
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === MASTER_ACCOUNT_EMAIL) {
      alert('No se puede eliminar la cuenta master');
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${userEmail}?`)) {
      return;
    }

    try {
      setLoading(true);
      await auth0ManagementService.deleteUser(userId);
      await loadData();
      alert('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error eliminando usuario');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la creación de roles
  const handleRoleCreated = async (newRole: Auth0Role) => {
    try {
      await loadData();
      alert(`Rol "${newRole.name}" creado correctamente`);
    } catch (error) {
      console.error('Error refreshing role list after creation:', error);
    }
  };

  // Función para mostrar modal de permisos del rol
  const handleManageRolePermissions = (role: Auth0Role) => {
    setSelectedRoleForPermissions(role);
    setShowRolePermissionsModal(true);
  };

  // Función para actualizar rol después de cambios
  const handleRoleUpdated = async () => {
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing role list after update:', error);
    }
  };

  // Función para mostrar modal de asignación de roles
  const handleAssignRoles = (user: User) => {
    setSelectedUserForRoles(user);
    setShowAssignRolesModal(true);
  };

  // Función para eliminar rol
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el rol "${roleName}"?\n\nEsta acción no se puede deshacer y afectará a todos los usuarios que tengan este rol asignado.`)) {
      return;
    }

    try {
      setLoading(true);
      await auth0ManagementService.deleteRole(roleId);
      await loadData();
      alert(`Rol "${roleName}" eliminado correctamente`);
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Error eliminando rol: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos de Auth0...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mostrar instrucciones si Auth0 no está configurado */}
      {!isAuth0Configured && <Auth0SetupInstructions />}
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          👥 Gestión de Permisos de Usuarios
        </h2>
        <p className="text-gray-600">
          Administra usuarios, roles y permisos basados en Auth0. Los usuarios se sincronizan automáticamente con Auth0.
        </p>
        <div className="flex items-center justify-between mt-4">
          <div>
            {!auth0ManagementService.isMasterAccount(currentUser?.email || '') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Solo la cuenta master ({MASTER_ACCOUNT_EMAIL}) puede modificar permisos de otros usuarios.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              📤 Exportar Config
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            👥 Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            🔰 Roles Auth0 ({auth0Roles.length})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            🔐 Permisos Detallados
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'setup'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            ⚙️ Configuración Inicial
          </button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <SecurityDashboard 
          users={users} 
          roles={auth0Roles} 
          onRefresh={loadData} 
        />
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Lista de Usuarios</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                👤➕ Crear Usuario
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                🔄 Sincronizar con Auth0
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Roles Auth0</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Último Login</th>
                  <th className="px-6 py-3">Logins</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={user.picture || '/images/user/default-avatar.png'}
                          alt={user.name}
                          className="w-8 h-8 rounded-full mr-3 object-cover"
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name}
                            {user.isMasterAccount && (
                              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                👑 MASTER
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs">
                            ID: {user.auth0Id || user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-gray-900">{user.email}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {user.auth0Data?.email_verified ? (
                            <span className="text-xs text-green-600">✅ Verificado</span>
                          ) : (
                            <span className="text-xs text-red-600">❌ No verificado</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">Sin roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? '🟢 Activo' : '🔴 Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        {user.lastLogin ? (
                          <>
                            <div>{new Date(user.lastLogin).toLocaleDateString('es-ES')}</div>
                            <div className="text-gray-500">
                              {new Date(user.lastLogin).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">Nunca</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {user.auth0Data?.logins_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowUserDetails(user)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Ver detalles"
                        >
                          👁️ Ver
                        </button>
                        
                        {!user.isMasterAccount && auth0ManagementService.isMasterAccount(currentUser?.email || '') && (
                          <>
                            <button
                              onClick={() => handleAssignRoles(user)}
                              className="text-purple-600 hover:text-purple-800 text-xs"
                              title="Asignar roles"
                            >
                              🔰 Roles
                            </button>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-green-600 hover:text-green-800 text-xs"
                              title="Gestionar permisos"
                            >
                              🔐 Permisos
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.auth0Id || user.id, user.email)}
                              className="text-red-600 hover:text-red-800 text-xs"
                              title="Eliminar usuario"
                            >
                              🗑️ Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Roles Auth0</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateRoleModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                disabled={!auth0ManagementService.isMasterAccount(currentUser?.email || '')}
              >
                🔰➕ Crear Rol
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>

          {!auth0ManagementService.isMasterAccount(currentUser?.email || '') && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-sm">
                ⚠️ Solo la cuenta master puede crear y gestionar roles.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auth0Roles.map((role) => (
              <div key={role.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-lg">{role.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {role.description?.split(' - Custom Permissions:')[0] || 'Sin descripción'}
                    </p>
                  </div>
                  <div className="ml-2">
                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-xs text-gray-500">
                    <strong>ID:</strong> {role.id}
                  </div>
                  
                  {/* Mostrar estadísticas de permisos si existen */}
                  {role.description?.includes('Custom Permissions:') && (
                    <div className="text-xs text-gray-500">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Permisos personalizados configurados
                    </div>
                  )}
                </div>

                {/* Acciones del rol */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManageRolePermissions(role)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    title="Gestionar permisos"
                  >
                    🔐 Permisos
                  </button>
                  
                  {auth0ManagementService.isMasterAccount(currentUser?.email || '') && (
                    <button
                      onClick={() => handleDeleteRole(role.id, role.name)}
                      className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      title="Eliminar rol"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {auth0Roles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔰</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay roles configurados</h3>
              <p className="text-gray-600 mb-4">
                Crea tu primer rol para comenzar a gestionar permisos
              </p>
              {auth0ManagementService.isMasterAccount(currentUser?.email || '') && (
                <button
                  onClick={() => setShowCreateRoleModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🔰➕ Crear Primer Rol
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Matriz de Permisos</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Usuario</th>
                  {SIDEBAR_MENUS.slice(0, 10).map(menu => (
                    <th key={menu.menuId} className="px-2 py-2 text-center text-xs">
                      {menu.menuName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{user.name}</td>
                    {SIDEBAR_MENUS.slice(0, 10).map(menu => (
                      <td key={menu.menuId} className="px-2 py-2 text-center">
                        <span className="text-xs px-1 py-1 rounded bg-green-100 text-green-800">
                          ✅
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onUserCreated={handleUserCreated}
      />

      {selectedUserForDetail && (
        <UserDetailModal
          isOpen={showUserDetailModal}
          onClose={() => {
            setShowUserDetailModal(false);
            setSelectedUserForDetail(null);
          }}
          user={selectedUserForDetail}
          onUserUpdated={handleUserCreated}
        />
      )}

      {/* Modal para crear roles */}
      <CreateRoleModal
        isOpen={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        onRoleCreated={handleRoleCreated}
      />

      {/* Modal para gestionar permisos de roles */}
      {selectedRoleForPermissions && (
        <RolePermissionsModal
          isOpen={showRolePermissionsModal}
          onClose={() => {
            setShowRolePermissionsModal(false);
            setSelectedRoleForPermissions(null);
          }}
          role={selectedRoleForPermissions}
          onRoleUpdated={handleRoleUpdated}
        />
      )}

      {/* Modal para asignar roles */}
      {selectedUserForRoles && (
        <AssignRolesModal
          isOpen={showAssignRolesModal}
          onClose={() => {
            setShowAssignRolesModal(false);
            setSelectedUserForRoles(null);
          }}
          user={selectedUserForRoles}
          availableRoles={auth0Roles}
          onUserUpdated={handleUserCreated}
        />
      )}

      {/* Modal para exportar configuración */}
      <ExportConfigModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        users={users}
        roles={auth0Roles}
      />

      {/* Modal de permisos detallados */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">
                Gestionar Permisos: {selectedUser.name}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="text-center py-8">
                <p className="text-gray-600">
                  🔧 Gestión de permisos detallados próximamente disponible
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Por ahora puedes ver y gestionar usuarios desde Auth0 Dashboard
                </p>
              </div>
            </div>

            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">Configuración Inicial del Sistema</h4>
                <p className="text-sm text-blue-700">
                  Utiliza esta sección para configurar la estructura inicial de roles y permisos del sistema.
                  Esta operación solo debe ejecutarse una vez durante la configuración inicial.
                </p>
              </div>
            </div>
          </div>

          <RoleInitializer onComplete={loadData} />

          <WorkflowManager 
            roles={auth0Roles} 
            onWorkflowApplied={loadData} 
          />

          <RoleTestingManager 
            users={users} 
            roles={auth0Roles} 
            onTestComplete={loadData} 
          />

          <InitialConfigExporter 
            users={users} 
            roles={auth0Roles} 
          />

          <PermissionTestingPanel />

          {/* Instrucciones adicionales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Verificar Auth0 M2M</h4>
                  <p className="text-sm text-gray-600">Asegúrate de tener configuradas las credenciales M2M en el archivo .env</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Inicializar Roles</h4>
                  <p className="text-sm text-gray-600">Ejecuta la inicialización para crear los roles básicos del sistema</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Asignar Roles</h4>
                  <p className="text-sm text-gray-600">Ve a la pestaña de usuarios para asignar roles a los usuarios existentes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Exportar Configuración</h4>
                  <p className="text-sm text-gray-600">Crea un respaldo de la configuración inicial para futuras referencias</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPermissionsManager;
