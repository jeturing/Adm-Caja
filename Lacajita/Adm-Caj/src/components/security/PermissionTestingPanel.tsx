import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { ProtectedContent, ProtectedButton, PermissionsDebugPanel } from './PermissionComponents';

export const PermissionTestingPanel: React.FC = () => {
  const { getPermissionSummary, refreshPermissions } = usePermissions();
  const summary = getPermissionSummary();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Verificación de Permisos en Frontend</h3>
          <p className="text-sm text-gray-600">Prueba el sistema de permisos implementado</p>
        </div>
        <button
          onClick={refreshPermissions}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Recargar Permisos</span>
        </button>
      </div>

      {/* Resumen de permisos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-medium text-blue-800">Estado</h4>
          </div>
          <p className="text-sm text-blue-700">
            {summary.isMasterAccount ? 'Master Account' : 'Usuario Normal'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h4 className="font-medium text-green-800">Roles</h4>
          </div>
          <p className="text-sm text-green-700">
            {summary.userRoles.length > 0 ? summary.userRoles.join(', ') : 'Sin roles'}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <h4 className="font-medium text-purple-800">Menús</h4>
          </div>
          <p className="text-sm text-purple-700">
            {summary.accessibleMenus}/{summary.totalMenus} accesibles
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-medium text-yellow-800">Estado</h4>
          </div>
          <p className="text-sm text-yellow-700">
            {summary.permissionsLoaded ? 'Cargados' : 'Cargando...'}
          </p>
        </div>
      </div>

      {/* Ejemplos de componentes protegidos */}
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Ejemplos de Componentes Protegidos:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ejemplo 1: Contenido protegido por vista */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Contenido con Permisos de Vista</h5>
              <ProtectedContent menuId="dashboard" permission="view">
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-700">✅ Puedes ver el dashboard</p>
                </div>
              </ProtectedContent>
              <ProtectedContent menuId="settings" permission="view" 
                fallback={
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">❌ No puedes ver configuraciones</p>
                  </div>
                }>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-700">✅ Puedes ver configuraciones</p>
                </div>
              </ProtectedContent>
            </div>

            {/* Ejemplo 2: Botones protegidos */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Botones con Permisos</h5>
              <div className="space-y-2">
                <ProtectedButton
                  menuId="users"
                  permission="create"
                  onClick={() => alert('Crear usuario')}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Crear Usuario
                </ProtectedButton>
                
                <ProtectedButton
                  menuId="settings"
                  permission="update"
                  onClick={() => alert('Actualizar configuración')}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Actualizar Config
                </ProtectedButton>
                
                <ProtectedButton
                  menuId="users"
                  permission="delete"
                  onClick={() => alert('Eliminar usuario')}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Eliminar Usuario
                </ProtectedButton>
              </div>
            </div>

            {/* Ejemplo 3: Contenido basado en roles */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Contenido por Roles</h5>
              <div className="space-y-2">
                <ProtectedContent menuId="dashboard" requireRole="Super_Admin">
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <p className="text-xs text-purple-700">🔑 Solo Super Admin</p>
                  </div>
                </ProtectedContent>
                
                <ProtectedContent menuId="dashboard" requireRole={['Editor', 'Content_Manager']}>
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-700">📝 Editor o Content Manager</p>
                  </div>
                </ProtectedContent>
                
                <ProtectedContent menuId="dashboard" requireRole="Viewer"
                  fallback={
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <p className="text-xs text-gray-700">👁️ Necesitas rol Viewer</p>
                    </div>
                  }>
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-xs text-green-700">👁️ Eres Viewer</p>
                  </div>
                </ProtectedContent>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de debug */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Panel de Debugging:</h4>
          <PermissionsDebugPanel />
        </div>
      </div>

      {/* Guía de implementación */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Cómo usar en tu código:</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <div>
            <strong>1. Hook de permisos:</strong>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              const {'{'} canView, canCreate, hasRole {'}'} = usePermissions();
            </code>
          </div>
          
          <div>
            <strong>2. Proteger contenido:</strong>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              {'<ProtectedContent menuId="users" permission="view">Contenido</ProtectedContent>'}
            </code>
          </div>
          
          <div>
            <strong>3. Proteger rutas:</strong>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              {'<ProtectedRoute menuId="admin">Página Admin</ProtectedRoute>'}
            </code>
          </div>
          
          <div>
            <strong>4. Botones condicionales:</strong>
            <code className="block bg-white p-2 rounded mt-1 text-xs">
              {'<ProtectedButton menuId="users" permission="create" onClick={...}>Crear</ProtectedButton>'}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
