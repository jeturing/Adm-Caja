import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

// Componente para proteger contenido basado en permisos
interface ProtectedContentProps {
  menuId: string;
  permission?: 'view' | 'create' | 'read' | 'update' | 'delete';
  requireRole?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ProtectedContent: React.FC<ProtectedContentProps> = ({
  menuId,
  permission = 'view',
  requireRole,
  fallback = null,
  children
}) => {
  const { hasPermission, hasRole, hasAnyRole, permissionsLoading, isMasterAccount } = usePermissions();

  // Mostrar loading mientras se cargan permisos
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600">Cargando permisos...</span>
      </div>
    );
  }

  // Verificar permisos
  let hasAccess = hasPermission(menuId, permission);

  // Verificar roles adicionales si se especifican
  if (requireRole && hasAccess) {
    if (Array.isArray(requireRole)) {
      hasAccess = hasAnyRole(requireRole);
    } else {
      hasAccess = hasRole(requireRole);
    }
  }

  // Mostrar contenido o fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Componente para botones protegidos
interface ProtectedButtonProps {
  menuId: string;
  permission: 'create' | 'update' | 'delete';
  requireRole?: string | string[];
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  menuId,
  permission,
  requireRole,
  onClick,
  children,
  className = '',
  disabled = false
}) => {
  const { hasPermission, hasRole, hasAnyRole, permissionsLoading } = usePermissions();

  let hasAccess = hasPermission(menuId, permission);
  
  if (requireRole && hasAccess) {
    if (Array.isArray(requireRole)) {
      hasAccess = hasAnyRole(requireRole);
    } else {
      hasAccess = hasRole(requireRole);
    }
  }

  const isDisabled = disabled || permissionsLoading || !hasAccess;

  if (!hasAccess && !permissionsLoading) {
    return null; // No mostrar el botón si no tiene permisos
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// Componente para rutas protegidas
interface ProtectedRouteProps {
  menuId: string;
  requireRole?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  menuId,
  requireRole,
  fallback,
  children
}) => {
  const { canAccess, hasRole, hasAnyRole, permissionsLoading } = usePermissions();

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  let hasAccess = canAccess(menuId);

  if (requireRole && hasAccess) {
    if (Array.isArray(requireRole)) {
      hasAccess = hasAnyRole(requireRole);
    } else {
      hasAccess = hasRole(requireRole);
    }
  }

  if (!hasAccess) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="h-24 w-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta sección.</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Componente para mostrar información de permisos (útil para debugging)
export const PermissionsDebugPanel: React.FC = () => {
  const { 
    userPermissions, 
    userRoles, 
    isMasterAccount, 
    getPermissionSummary,
    permissionsLoading 
  } = usePermissions();

  const summary = getPermissionSummary();

  if (permissionsLoading) {
    return <div className="text-sm text-gray-500">Cargando permisos...</div>;
  }

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs">
      <h4 className="font-semibold mb-2">Debug: Permisos del Usuario</h4>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Estado:</span>{' '}
          {isMasterAccount ? (
            <span className="text-green-600">Master Account</span>
          ) : (
            <span className="text-blue-600">Usuario Normal</span>
          )}
        </div>
        
        <div>
          <span className="font-medium">Roles:</span>{' '}
          {summary.userRoles.length > 0 ? (
            <span className="text-gray-700">{summary.userRoles.join(', ')}</span>
          ) : (
            <span className="text-gray-500">Sin roles asignados</span>
          )}
        </div>
        
        <div>
          <span className="font-medium">Menús accesibles:</span>{' '}
          <span className="text-gray-700">{summary.accessibleMenus}/{summary.totalMenus}</span>
        </div>
        
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Ver permisos detallados</summary>
          <div className="mt-2 bg-white border rounded p-2 max-h-40 overflow-y-auto">
            <pre className="text-xs">{JSON.stringify(userPermissions, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
};

// HOC para proteger componentes completos
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: {
    menuId: string;
    permission?: 'view' | 'create' | 'read' | 'update' | 'delete';
    requireRole?: string | string[];
    fallback?: React.ComponentType;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedContent
        menuId={config.menuId}
        permission={config.permission}
        requireRole={config.requireRole}
        fallback={config.fallback ? <config.fallback /> : undefined}
      >
        <WrappedComponent {...props} />
      </ProtectedContent>
    );
  };
}
