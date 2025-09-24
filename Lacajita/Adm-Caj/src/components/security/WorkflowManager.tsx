import React, { useState } from 'react';
import { Auth0Role, SIDEBAR_MENUS } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

// Definición de flujos de trabajo del sistema
const WORKFLOW_TEMPLATES = {
  content_management: {
    name: 'Gestión de Contenido',
    description: 'Flujo para gestores de contenido y editores',
    roles: ['Content_Manager', 'Editor'],
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      ecommerce: { view: true, create: true, read: true, update: true, delete: false },
      calendar: { view: true, create: true, read: true, update: true, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      forms: { view: true, create: true, read: true, update: true, delete: true },
      tables: { view: true, create: true, read: true, update: true, delete: false },
      // Módulos de contenido
      'ui-forms': { view: true, create: true, read: true, update: true, delete: false },
      'ui-tables': { view: true, create: true, read: true, update: true, delete: false },
      'ui-charts': { view: true, create: false, read: true, update: false, delete: false },
    }
  },
  
  user_management: {
    name: 'Gestión de Usuarios',
    description: 'Flujo para administradores de usuarios',
    roles: ['Super_Admin'],
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      settings: { view: true, create: true, read: true, update: true, delete: true },
      authentication: { view: true, create: true, read: true, update: true, delete: true },
      // Todos los módulos administrativos
      ...Object.fromEntries(
        SIDEBAR_MENUS.map(menu => [
          menu.menuId,
          { view: true, create: true, read: true, update: true, delete: true }
        ])
      )
    }
  },
  
  analytics_reporting: {
    name: 'Análisis y Reportes',
    description: 'Flujo para analistas y usuarios de reportes',
    roles: ['Editor', 'Viewer'],
    permissions: {
      dashboard: { view: true, create: false, read: true, update: false, delete: false },
      analytics: { view: true, create: false, read: true, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      'ui-charts': { view: true, create: false, read: true, update: false, delete: false },
      'ui-tables': { view: true, create: false, read: true, update: false, delete: false },
      forms: { view: true, create: false, read: true, update: false, delete: false },
      // Solo lectura en la mayoría de módulos
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'analytics', 'profile', 'ui-charts', 'ui-tables', 'forms', 'settings', 'authentication'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: true, create: false, read: true, update: false, delete: false }
        ])
      )
    }
  },
  
  guest_access: {
    name: 'Acceso de Invitados',
    description: 'Flujo para usuarios invitados temporales',
    roles: ['Guest'],
    permissions: {
      dashboard: { view: true, create: false, read: false, update: false, delete: false },
      profile: { view: true, create: false, read: true, update: true, delete: false },
      // Resto sin acceso
      ...Object.fromEntries(
        SIDEBAR_MENUS.filter(menu => 
          !['dashboard', 'profile'].includes(menu.menuId)
        ).map(menu => [
          menu.menuId,
          { view: false, create: false, read: false, update: false, delete: false }
        ])
      )
    }
  }
};

interface WorkflowManagerProps {
  roles: Auth0Role[];
  onWorkflowApplied?: () => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ 
  roles, 
  onWorkflowApplied 
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  const handleApplyWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsApplying(true);
    setApplicationStatus(null);

    try {
      const workflow = WORKFLOW_TEMPLATES[selectedWorkflow as keyof typeof WORKFLOW_TEMPLATES];
      const results: string[] = [];

      console.log(`🔄 Aplicando flujo de trabajo: ${workflow.name}`);

      // Aplicar permisos a cada rol del flujo de trabajo
      for (const roleName of workflow.roles) {
        try {
          // Buscar el rol en Auth0
          const auth0Role = roles.find(r => r.name === roleName);
          
          if (auth0Role) {
            // Aplicar permisos personalizados del flujo de trabajo
            await auth0ManagementService.createCustomMenuPermissions(
              auth0Role.id,
              workflow.permissions
            );
            
            results.push(`✅ Permisos aplicados a rol: ${roleName}`);
            console.log(`✅ Permisos aplicados correctamente a ${roleName}`);
          } else {
            results.push(`⚠️ Rol ${roleName} no encontrado en Auth0`);
            console.warn(`Rol ${roleName} no encontrado`);
          }
          
          // Pausa entre aplicaciones
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Error aplicando permisos a ${roleName}:`, error);
          results.push(`❌ Error en rol ${roleName}: ${error}`);
        }
      }

      setApplicationStatus({
        success: true,
        message: `Flujo de trabajo "${workflow.name}" aplicado correctamente`,
        details: results
      });

      // Notificar completión
      if (onWorkflowApplied) {
        onWorkflowApplied();
      }

    } catch (error) {
      console.error('Error aplicando flujo de trabajo:', error);
      setApplicationStatus({
        success: false,
        message: 'Error al aplicar flujo de trabajo',
        details: [`❌ ${error}`]
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getWorkflowRoleStatus = (workflowKey: string) => {
    const workflow = WORKFLOW_TEMPLATES[workflowKey as keyof typeof WORKFLOW_TEMPLATES];
    const availableRoles = workflow.roles.filter(roleName => 
      roles.some(r => r.name === roleName)
    );
    
    return {
      total: workflow.roles.length,
      available: availableRoles.length,
      missing: workflow.roles.filter(roleName => 
        !roles.some(r => r.name === roleName)
      )
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Flujos de Trabajo</h3>
          <p className="text-sm text-gray-600">Aplica configuraciones de permisos predefinidas según flujos de trabajo</p>
        </div>
      </div>

      {/* Selección de flujo de trabajo */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-700">Seleccionar Flujo de Trabajo:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(WORKFLOW_TEMPLATES).map(([key, workflow]) => {
            const roleStatus = getWorkflowRoleStatus(key);
            const isComplete = roleStatus.available === roleStatus.total;
            
            return (
              <div
                key={key}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedWorkflow === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${!isComplete ? 'opacity-75' : ''}`}
                onClick={() => setSelectedWorkflow(key)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{workflow.name}</h5>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isComplete
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {roleStatus.available}/{roleStatus.total} roles
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Roles afectados:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workflow.roles.map(roleName => {
                        const exists = roles.some(r => r.name === roleName);
                        return (
                          <span
                            key={roleName}
                            className={`px-2 py-1 rounded text-xs ${
                              exists
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {roleName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {roleStatus.missing.length > 0 && (
                    <div className="text-xs text-red-600">
                      <span className="font-medium">Roles faltantes:</span> {roleStatus.missing.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón de aplicar */}
      {selectedWorkflow && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Flujo seleccionado:</span> {WORKFLOW_TEMPLATES[selectedWorkflow as keyof typeof WORKFLOW_TEMPLATES].name}
            </div>
            <button
              onClick={handleApplyWorkflow}
              disabled={isApplying}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                       text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              {isApplying ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Aplicando...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Aplicar Flujo de Trabajo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status de la aplicación */}
      {applicationStatus && (
        <div className={`mt-4 border rounded-lg p-4 ${
          applicationStatus.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {applicationStatus.success ? (
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
              applicationStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {applicationStatus.message}
            </h4>
          </div>
          
          {applicationStatus.details && (
            <ul className="space-y-1">
              {applicationStatus.details.map((detail, index) => (
                <li key={index} className={`text-sm ${
                  applicationStatus.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Información sobre flujos de trabajo */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Información sobre Flujos de Trabajo</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Los flujos de trabajo aplican configuraciones predefinidas de permisos</li>
          <li>• Cada flujo está optimizado para tipos específicos de usuarios</li>
          <li>• Los permisos se almacenan en las descripciones de los roles de Auth0</li>
          <li>• Puedes personalizar permisos individuales después de aplicar un flujo</li>
        </ul>
      </div>
    </div>
  );
};
