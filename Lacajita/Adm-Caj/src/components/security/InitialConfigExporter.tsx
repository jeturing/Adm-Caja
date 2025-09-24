import React, { useState } from 'react';
import { User, Auth0Role, SIDEBAR_MENUS } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

interface InitialConfigExporterProps {
  users: User[];
  roles: Auth0Role[];
}

export const InitialConfigExporter: React.FC<InitialConfigExporterProps> = ({
  users,
  roles
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    success: boolean;
    message: string;
    filename?: string;
  } | null>(null);

  const generateInitialConfigExport = async () => {
    setIsExporting(true);
    setExportStatus(null);

    try {
      console.log('📤 Generando exportación de configuración inicial...');

      // Obtener permisos detallados de cada rol
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          try {
            const permissions = await extractCustomPermissions(role);
            return {
              ...role,
              customPermissions: permissions
            };
          } catch (error) {
            console.warn(`No se pudieron obtener permisos para rol ${role.name}:`, error);
            return {
              ...role,
              customPermissions: {}
            };
          }
        })
      );

      // Obtener roles de usuarios
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          try {
            const userRoles = await auth0ManagementService.getUserRoles(user.auth0Id);
            return {
              ...user,
              assignedRoles: userRoles.map(r => ({ id: r.id, name: r.name }))
            };
          } catch (error) {
            console.warn(`No se pudieron obtener roles para usuario ${user.email}:`, error);
            return {
              ...user,
              assignedRoles: []
            };
          }
        })
      );

      // Generar configuración completa
      const initialConfig = {
        // Metadatos de exportación
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          description: 'Configuración inicial del sistema de permisos',
          auth0Domain: import.meta.env.VITE_AUTH0_DOMAIN,
          systemInfo: {
            totalUsers: users.length,
            totalRoles: roles.length,
            totalMenus: SIDEBAR_MENUS.length
          }
        },

        // Configuración de roles
        roles: {
          summary: {
            total: roles.length,
            withCustomPermissions: rolesWithPermissions.filter(r => 
              Object.keys(r.customPermissions).length > 0
            ).length
          },
          data: rolesWithPermissions.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            customPermissions: role.customPermissions,
            createdFor: getSelectedRoleTemplate(role.name)
          }))
        },

        // Configuración de usuarios
        users: {
          summary: {
            total: users.length,
            withRoles: usersWithRoles.filter(u => u.assignedRoles.length > 0).length,
            masterAccounts: users.filter(u => u.isMasterAccount).length
          },
          data: usersWithRoles.map(user => ({
            id: user.id,
            auth0Id: user.auth0Id,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
            isMasterAccount: user.isMasterAccount,
            assignedRoles: user.assignedRoles,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          }))
        },

        // Configuración de menús y permisos
        menuConfiguration: {
          sidebarMenus: SIDEBAR_MENUS.map(menu => ({
            menuId: menu.menuId,
            menuName: menu.menuName,
            path: menu.path,
            icon: menu.icon
          })),
          permissionMatrix: generatePermissionMatrix(rolesWithPermissions)
        },

        // Configuración de Auth0 M2M
        auth0Configuration: {
          domain: import.meta.env.VITE_AUTH0_DOMAIN,
          clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
          m2mConfigured: !!import.meta.env.VITE_AUTH0_M2M_CLIENT_ID,
          requiredScopes: [
            'read:users',
            'update:users', 
            'delete:users',
            'create:users',
            'read:roles',
            'update:roles',
            'delete:roles',
            'create:roles',
            'read:role_members',
            'create:role_members',
            'delete:role_members',
            'read:logs'
          ]
        },

        // Instrucciones de restauración
        restoration: {
          instructions: [
            '1. Configurar Auth0 M2M con los scopes requeridos',
            '2. Crear roles utilizando la API de Auth0 Management',
            '3. Asignar permisos personalizados a cada rol',
            '4. Asignar roles a usuarios según configuración',
            '5. Verificar funcionamiento del sistema de permisos'
          ],
          notes: [
            'Los permisos personalizados se almacenan en las descripciones de roles',
            'Los usuarios master mantienen acceso completo independientemente de roles',
            'Esta configuración fue generada automáticamente por el sistema'
          ]
        }
      };

      // Generar archivo de descarga
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `initial-config-backup-${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(initialConfig, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus({
        success: true,
        message: 'Configuración inicial exportada exitosamente',
        filename
      });

      console.log('✅ Exportación completada:', filename);

    } catch (error) {
      console.error('Error exportando configuración inicial:', error);
      setExportStatus({
        success: false,
        message: 'Error al exportar configuración inicial'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Función auxiliar para extraer permisos personalizados
  const extractCustomPermissions = async (role: Auth0Role) => {
    try {
      if (!role.description) return {};
      
      // Intentar parsear permisos de la descripción
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
      console.warn(`Error parsing permissions for role ${role.name}:`, error);
      return {};
    }
  };

  // Generar matriz de permisos
  const generatePermissionMatrix = (rolesWithPermissions: any[]) => {
    const matrix: any = {};
    
    SIDEBAR_MENUS.forEach(menu => {
      matrix[menu.menuId] = {
        menuName: menu.menuName,
        path: menu.path,
        roles: {}
      };
      
      rolesWithPermissions.forEach(role => {
        const menuPermissions = role.customPermissions[menu.menuId];
        if (menuPermissions) {
          matrix[menu.menuId].roles[role.name] = menuPermissions;
        }
      });
    });
    
    return matrix;
  };

  // Obtener template de rol
  const getSelectedRoleTemplate = (roleName: string) => {
    const templates: any = {
      'Super_Admin': 'admin_full_access',
      'Content_Manager': 'content_management', 
      'Editor': 'content_editing',
      'Viewer': 'analytics_reporting',
      'Guest': 'guest_access'
    };
    
    return templates[roleName] || 'custom';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Exportar Configuración Inicial</h3>
          <p className="text-sm text-gray-600">Crea un respaldo completo de la configuración del sistema</p>
        </div>
        <button
          onClick={generateInitialConfigExport}
          disabled={isExporting}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 
                   text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          {isExporting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Exportar Configuración</span>
            </>
          )}
        </button>
      </div>

      {/* Información sobre la exportación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h4 className="font-medium text-blue-800">Usuarios</h4>
          </div>
          <p className="text-sm text-blue-700">
            {users.length} usuarios con roles asignados y configuraciones
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h4 className="font-medium text-green-800">Roles</h4>
          </div>
          <p className="text-sm text-green-700">
            {roles.length} roles con permisos personalizados detallados
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <h4 className="font-medium text-purple-800">Configuración</h4>
          </div>
          <p className="text-sm text-purple-700">
            Configuración completa de Auth0 y sistema de permisos
          </p>
        </div>
      </div>

      {/* Status de exportación */}
      {exportStatus && (
        <div className={`border rounded-lg p-4 ${
          exportStatus.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {exportStatus.success ? (
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <h4 className={`font-medium ${
              exportStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {exportStatus.message}
            </h4>
          </div>
          
          {exportStatus.filename && (
            <p className="text-sm text-green-700">
              Archivo generado: <code className="bg-green-100 px-1 rounded">{exportStatus.filename}</code>
            </p>
          )}
        </div>
      )}

      {/* Información sobre el respaldo */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">¿Qué incluye el respaldo?</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Metadatos:</strong> Información del sistema y timestamp</li>
          <li>• <strong>Roles:</strong> Todos los roles con permisos personalizados detallados</li>
          <li>• <strong>Usuarios:</strong> Lista de usuarios con roles asignados</li>
          <li>• <strong>Configuración de menús:</strong> Estructura completa del sidebar</li>
          <li>• <strong>Matriz de permisos:</strong> Permisos detallados por rol y menú</li>
          <li>• <strong>Configuración Auth0:</strong> Configuración M2M y scopes requeridos</li>
          <li>• <strong>Instrucciones:</strong> Guía para restaurar la configuración</li>
        </ul>
      </div>
    </div>
  );
};
