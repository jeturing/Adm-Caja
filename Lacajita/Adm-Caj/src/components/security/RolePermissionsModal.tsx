import React, { useState, useEffect } from 'react';
import { Auth0Role, SIDEBAR_MENUS } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Auth0Role;
  onRoleUpdated: (role: Auth0Role) => void;
}

interface MenuPermissions {
  [menuId: string]: {
    view: boolean;
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  role,
  onRoleUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<MenuPermissions>({});
  const [activeTab, setActiveTab] = useState<'permissions' | 'info'>('permissions');

  // Cargar permisos existentes del rol
  useEffect(() => {
    if (isOpen && role) {
      loadRolePermissions();
    }
  }, [isOpen, role]);

  const loadRolePermissions = async () => {
    setLoading(true);
    try {
      // Extraer permisos personalizados del description del rol
      const customPermissions = extractCustomPermissions(role.description || '');
      
      // Inicializar permisos para todos los menús
      const initialPermissions: MenuPermissions = {};
      SIDEBAR_MENUS.forEach(menu => {
        initialPermissions[menu.menuId] = customPermissions[menu.menuId] || {
          view: false,
          create: false,
          read: false,
          update: false,
          delete: false
        };
      });

      setPermissions(initialPermissions);
    } catch (error) {
      console.error('Error loading role permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractCustomPermissions = (description: string): MenuPermissions => {
    try {
      const match = description.match(/Custom Permissions: ({.*})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (error) {
      console.error('Error parsing custom permissions:', error);
    }
    return {};
  };

  const handlePermissionChange = (menuId: string, permission: keyof MenuPermissions[string], value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [permission]: value
      }
    }));
  };

  const handleSelectAll = (menuId: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [menuId]: {
        view: value,
        create: value,
        read: value,
        update: value,
        delete: value
      }
    }));
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await auth0ManagementService.createCustomMenuPermissions(role.id, permissions);
      
      // Recargar el rol actualizado
      const updatedRole = await auth0ManagementService.getRole(role.id);
      onRoleUpdated(updatedRole);
      
      alert('Permisos guardados correctamente');
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error guardando permisos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const getPermissionStats = () => {
    const stats = { total: 0, granted: 0 };
    Object.values(permissions).forEach(menuPerms => {
      Object.values(menuPerms).forEach(perm => {
        stats.total++;
        if (perm) stats.granted++;
      });
    });
    return stats;
  };

  if (!isOpen) return null;

  const stats = getPermissionStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              🔐 Gestionar Permisos: {role.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {role.description?.split(' - Custom Permissions:')[0] || 'Sin descripción'}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                ID: {role.id}
              </span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                Permisos: {stats.granted}/{stats.total}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🔐 Permisos por Menú
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ℹ️ Información del Rol
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando permisos...</p>
              </div>
            </div>
          ) : activeTab === 'permissions' ? (
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-2">
                  Permisos por Menú del Sidebar
                </h4>
                <p className="text-sm text-gray-600">
                  Configura los permisos específicos para cada sección del sistema.
                </p>
              </div>

              <div className="space-y-4">
                {SIDEBAR_MENUS.map((menu) => {
                  const menuPerms = permissions[menu.menuId] || {
                    view: false, create: false, read: false, update: false, delete: false
                  };
                  const allSelected = Object.values(menuPerms).every(p => p);
                  const someSelected = Object.values(menuPerms).some(p => p);

                  return (
                    <div key={menu.menuId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{menu.icon}</span>
                          <div>
                            <h5 className="font-medium text-gray-900">{menu.menuName}</h5>
                            <p className="text-xs text-gray-500">{menu.path}</p>
                          </div>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={input => {
                              if (input) input.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={(e) => handleSelectAll(menu.menuId, e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Seleccionar todo</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        {Object.entries(menuPerms).map(([permission, value]) => (
                          <label
                            key={permission}
                            className="flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handlePermissionChange(
                                menu.menuId, 
                                permission as keyof MenuPermissions[string], 
                                e.target.checked
                              )}
                              className="mr-2"
                            />
                            <div className="text-center">
                              <div className="text-lg">
                                {permission === 'view' && '👁️'}
                                {permission === 'create' && '➕'}
                                {permission === 'read' && '📖'}
                                {permission === 'update' && '✏️'}
                                {permission === 'delete' && '🗑️'}
                              </div>
                              <div className="text-xs text-gray-600 capitalize">
                                {permission === 'view' && 'Ver'}
                                {permission === 'create' && 'Crear'}
                                {permission === 'read' && 'Leer'}
                                {permission === 'update' && 'Editar'}
                                {permission === 'delete' && 'Eliminar'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h4 className="text-lg font-medium text-gray-800 mb-4">
                Información del Rol
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-900">
                    {role.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID del Rol
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-900 font-mono text-sm">
                    {role.id}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-900">
                    {role.description?.split(' - Custom Permissions:')[0] || 'Sin descripción'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estadísticas de Permisos
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-2xl font-bold text-blue-600">{stats.granted}</div>
                      <div className="text-sm text-blue-800">Permisos otorgados</div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
                      <div className="text-sm text-gray-800">Total de permisos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {saving ? 'Guardando...' : '💾 Guardar Permisos'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsModal;
