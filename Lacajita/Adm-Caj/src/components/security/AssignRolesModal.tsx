import React, { useState, useEffect } from 'react';
import { User, Auth0Role } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

interface AssignRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  availableRoles: Auth0Role[];
  onUserUpdated: (user: User) => void;
}

const AssignRolesModal: React.FC<AssignRolesModalProps> = ({
  isOpen,
  onClose,
  user,
  availableRoles,
  onUserUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<Auth0Role[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      loadUserRoles();
    }
  }, [isOpen, user]);

  const loadUserRoles = async () => {
    setLoading(true);
    try {
      // Obtener roles actuales del usuario
      const userRoles = await auth0ManagementService.getUserRoles(user.auth0Id || user.id);
      setCurrentUserRoles(userRoles);
      setSelectedRoles(userRoles.map(role => role.id));
    } catch (error) {
      console.error('Error loading user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string, isAssigned: boolean) => {
    if (isAssigned) {
      setSelectedRoles(prev => [...prev, roleId]);
    } else {
      setSelectedRoles(prev => prev.filter(id => id !== roleId));
    }
  };

  const handleSaveRoles = async () => {
    setSaving(true);
    try {
      const currentRoleIds = currentUserRoles.map(role => role.id);
      const toAssign = selectedRoles.filter(roleId => !currentRoleIds.includes(roleId));
      const toRemove = currentRoleIds.filter(roleId => !selectedRoles.includes(roleId));

      // Asignar nuevos roles
      if (toAssign.length > 0) {
        await auth0ManagementService.assignRolesToUser(user.auth0Id || user.id, toAssign);
      }

      // Remover roles
      if (toRemove.length > 0) {
        await auth0ManagementService.removeRolesFromUser(user.auth0Id || user.id, toRemove);
      }

      // Recargar el usuario actualizado
      const updatedAuth0User = await auth0ManagementService.getUser(user.auth0Id || user.id);
      const updatedUser = await auth0ManagementService.syncUserWithLocal(updatedAuth0User);
      
      onUserUpdated(updatedUser);
      onClose();
      
      alert('Roles actualizados correctamente');
    } catch (error) {
      console.error('Error updating user roles:', error);
      alert('Error actualizando roles: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const getRoleChangesSummary = () => {
    const currentRoleIds = currentUserRoles.map(role => role.id);
    const toAssign = selectedRoles.filter(roleId => !currentRoleIds.includes(roleId));
    const toRemove = currentRoleIds.filter(roleId => !selectedRoles.includes(roleId));
    
    return { toAssign, toRemove };
  };

  if (!isOpen) return null;

  const { toAssign, toRemove } = getRoleChangesSummary();
  const hasChanges = toAssign.length > 0 || toRemove.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              🔰 Asignar Roles: {user.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            {user.isMasterAccount && (
              <div className="mt-2">
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                  👑 Cuenta Master - Roles no modificables
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando roles del usuario...</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {user.isMasterAccount ? (
                <div className="text-center py-8">
                  <div className="text-yellow-500 text-6xl mb-4">👑</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cuenta Master</h3>
                  <p className="text-gray-600">
                    La cuenta master tiene todos los permisos por defecto y no puede ser modificada.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-2">
                      Roles Disponibles
                    </h4>
                    <p className="text-sm text-gray-600">
                      Selecciona los roles que quieres asignar a este usuario.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {availableRoles.map((role) => {
                      const isCurrentlyAssigned = currentUserRoles.some(ur => ur.id === role.id);
                      const isSelected = selectedRoles.includes(role.id);
                      const isChanged = isCurrentlyAssigned !== isSelected;

                      return (
                        <label
                          key={role.id}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          } ${isChanged ? 'ring-2 ring-orange-200' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRoleToggle(role.id, e.target.checked)}
                            className="mr-4 h-4 w-4 text-blue-600"
                            disabled={saving}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900">{role.name}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {role.description?.split(' - Custom Permissions:')[0] || 'Sin descripción'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isCurrentlyAssigned && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                    Actual
                                  </span>
                                )}
                                {isChanged && (
                                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                    {isSelected ? 'Asignar' : 'Remover'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {availableRoles.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-6xl mb-4">🔰</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay roles disponibles</h3>
                      <p className="text-gray-600">
                        Crea algunos roles primero en la sección de Roles Auth0.
                      </p>
                    </div>
                  )}

                  {/* Resumen de cambios */}
                  {hasChanges && (
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h5 className="font-medium text-orange-800 mb-2">Cambios pendientes:</h5>
                      
                      {toAssign.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-orange-700">
                            <strong>Asignar:</strong> {toAssign.map(roleId => 
                              availableRoles.find(r => r.id === roleId)?.name
                            ).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {toRemove.length > 0 && (
                        <div>
                          <span className="text-sm text-orange-700">
                            <strong>Remover:</strong> {toRemove.map(roleId => 
                              currentUserRoles.find(r => r.id === roleId)?.name
                            ).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
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
          {!user.isMasterAccount && (
            <button
              onClick={handleSaveRoles}
              disabled={saving || loading || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {saving ? 'Guardando...' : hasChanges ? '💾 Guardar Cambios' : '✅ Sin Cambios'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignRolesModal;
