import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import { auth0ManagementService } from '../services/auth0ManagementService';
import { Auth0Role, MASTER_ACCOUNT_EMAIL } from '../types/permissions';

// Tipos para permisos
export interface MenuPermissions {
  view: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  [menuId: string]: MenuPermissions;
}

// Hook para verificación de permisos
export const usePermissions = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [userRoles, setUserRoles] = useState<Auth0Role[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [isMasterAccount, setIsMasterAccount] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      loadUserPermissions();
    }
  }, [isAuthenticated, user, isLoading]);

  const loadUserPermissions = async () => {
    if (!user?.sub) return;

    try {
      setPermissionsLoading(true);

      // Verificar si es cuenta master
      const masterAccount = user.email === MASTER_ACCOUNT_EMAIL;
      setIsMasterAccount(masterAccount);

      if (masterAccount) {
        // La cuenta master tiene todos los permisos
        setUserPermissions(getMasterAccountPermissions());
        setUserRoles([]);
        return;
      }

      // Obtener roles del usuario
      const roles = await auth0ManagementService.getUserRoles(user.sub);
      setUserRoles(roles);

      // Combinar permisos de todos los roles
      const combinedPermissions = await combineRolePermissions(roles);
      setUserPermissions(combinedPermissions);

    } catch (error) {
      console.error('Error cargando permisos del usuario:', error);
      // En caso de error, asignar permisos mínimos
      setUserPermissions(getDefaultPermissions());
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Combinar permisos de múltiples roles
  const combineRolePermissions = async (roles: Auth0Role[]): Promise<UserPermissions> => {
    const combinedPermissions: UserPermissions = {};

    for (const role of roles) {
      try {
        const rolePermissions = await extractRolePermissions(role);
        
        // Combinar permisos (OR lógico - si cualquier rol permite, se permite)
        Object.keys(rolePermissions).forEach(menuId => {
          if (!combinedPermissions[menuId]) {
            combinedPermissions[menuId] = {
              view: false,
              create: false,
              read: false,
              update: false,
              delete: false
            };
          }

          const existingPerms = combinedPermissions[menuId];
          const newPerms = rolePermissions[menuId];

          combinedPermissions[menuId] = {
            view: existingPerms.view || newPerms.view,
            create: existingPerms.create || newPerms.create,
            read: existingPerms.read || newPerms.read,
            update: existingPerms.update || newPerms.update,
            delete: existingPerms.delete || newPerms.delete
          };
        });

      } catch (error) {
        console.warn(`Error procesando permisos del rol ${role.name}:`, error);
      }
    }

    return combinedPermissions;
  };

  // Extraer permisos de un rol
  const extractRolePermissions = async (role: Auth0Role): Promise<UserPermissions> => {
    try {
      if (!role.description) return {};

      // Buscar permisos en la descripción del rol
      const descriptionLines = role.description.split('\n');
      const permissionsLine = descriptionLines.find(line => 
        line.includes('PERMISSIONS:') || line.includes('"view":') || line.includes('"create":')
      );

      if (permissionsLine) {
        const permissionsStr = permissionsLine.replace('PERMISSIONS:', '').trim();
        return JSON.parse(permissionsStr);
      }

      return {};
    } catch (error) {
      console.warn(`Error parseando permisos del rol ${role.name}:`, error);
      return {};
    }
  };

  // Permisos para cuenta master
  const getMasterAccountPermissions = (): UserPermissions => {
    const masterPermissions: UserPermissions = {};
    
    // Lista de menús comunes (puedes expandir esto)
    const commonMenus = [
      'dashboard', 'analytics', 'users', 'roles', 'permissions', 'settings',
      'ecommerce', 'calendar', 'profile', 'forms', 'tables', 'charts',
      'authentication', 'videos', 'playlists'
    ];

    commonMenus.forEach(menuId => {
      masterPermissions[menuId] = {
        view: true,
        create: true,
        read: true,
        update: true,
        delete: true
      };
    });

    return masterPermissions;
  };

  // Permisos por defecto (mínimos)
  const getDefaultPermissions = (): UserPermissions => {
    return {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false }
    };
  };

  // Funciones de verificación
  const hasPermission = (menuId: string, permission: keyof MenuPermissions): boolean => {
    if (isMasterAccount) return true;
    
    const menuPermissions = userPermissions[menuId];
    if (!menuPermissions) return false;
    
    return menuPermissions[permission];
  };

  const canView = (menuId: string): boolean => hasPermission(menuId, 'view');
  const canCreate = (menuId: string): boolean => hasPermission(menuId, 'create');
  const canRead = (menuId: string): boolean => hasPermission(menuId, 'read');
  const canUpdate = (menuId: string): boolean => hasPermission(menuId, 'update');
  const canDelete = (menuId: string): boolean => hasPermission(menuId, 'delete');

  // Verificar si puede acceder a cualquier función de un menú
  const canAccess = (menuId: string): boolean => {
    if (isMasterAccount) return true;
    
    const menuPermissions = userPermissions[menuId];
    if (!menuPermissions) return false;
    
    return Object.values(menuPermissions).some(permission => permission);
  };

  // Verificar roles específicos
  const hasRole = (roleName: string): boolean => {
    if (isMasterAccount) return true;
    return userRoles.some(role => role.name === roleName);
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (isMasterAccount) return true;
    return roleNames.some(roleName => hasRole(roleName));
  };

  // Información sobre permisos del usuario
  const getPermissionSummary = () => {
    const totalMenus = Object.keys(userPermissions).length;
    const accessibleMenus = Object.keys(userPermissions).filter(menuId => canAccess(menuId)).length;
    
    return {
      totalMenus,
      accessibleMenus,
      userRoles: userRoles.map(r => r.name),
      isMasterAccount,
      permissionsLoaded: !permissionsLoading
    };
  };

  return {
    // Estado
    userPermissions,
    userRoles,
    permissionsLoading,
    isMasterAccount,
    
    // Funciones de verificación
    hasPermission,
    canView,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canAccess,
    
    // Verificación de roles
    hasRole,
    hasAnyRole,
    
    // Utilidades
    getPermissionSummary,
    refreshPermissions: loadUserPermissions
  };
};
