import React, { useState } from 'react';
import { initializeBasicRoles, verifyRoleStructure, ROLE_DESCRIPTIONS } from '../../scripts/initializeRoles';

interface RoleInitializerProps {
  onComplete?: () => void;
}

export const RoleInitializer: React.FC<RoleInitializerProps> = ({ onComplete }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [initStatus, setInitStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  const handleInitializeRoles = async () => {
    setIsInitializing(true);
    setInitStatus(null);

    try {
      console.log('🔰 Iniciando proceso de creación de roles...');
      
      await initializeBasicRoles();
      
      setInitStatus({
        success: true,
        message: 'Roles básicos creados exitosamente',
        details: [
          '✅ Super_Admin - Acceso completo al sistema',
          '✅ Content_Manager - Gestión de contenido',
          '✅ Editor - Edición limitada',
          '✅ Viewer - Solo lectura',
          '✅ Guest - Acceso muy limitado'
        ]
      });

      // Notificar completión
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Error inicializando roles:', error);
      setInitStatus({
        success: false,
        message: 'Error al crear roles básicos',
        details: [
          'Verifica que las credenciales Auth0 M2M estén configuradas',
          'Revisa que los scopes requeridos estén habilitados',
          'Consulta la consola para más detalles del error'
        ]
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleVerifyStructure = async () => {
    setIsVerifying(true);
    setInitStatus(null);

    try {
      const isValid = await verifyRoleStructure();
      
      setInitStatus({
        success: isValid,
        message: isValid 
          ? 'Estructura de roles verificada correctamente' 
          : 'Faltan algunos roles básicos',
        details: isValid 
          ? ['✅ Todos los roles básicos están presentes']
          : ['⚠️ Algunos roles básicos no están configurados', 'Ejecuta la inicialización para crearlos']
      });

    } catch (error) {
      console.error('Error verificando estructura:', error);
      setInitStatus({
        success: false,
        message: 'Error al verificar estructura de roles',
        details: ['❌ No se pudo conectar con Auth0 Management API']
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Inicialización de Roles</h3>
          <p className="text-sm text-gray-600">Configura la estructura básica de roles del sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerifyStructure}
            disabled={isVerifying || isInitializing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            {isVerifying ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verificar</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleInitializeRoles}
            disabled={isInitializing || isVerifying}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                     text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            {isInitializing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Inicializando...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Inicializar Roles</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Roles básicos que se crearán */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Roles que se crearán:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLE_DESCRIPTIONS).map(([roleName, description]) => (
            <div key={roleName} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-sm text-gray-900">{roleName}</span>
              </div>
              <p className="text-xs text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status de la operación */}
      {initStatus && (
        <div className={`border rounded-lg p-4 ${
          initStatus.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {initStatus.success ? (
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
              initStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {initStatus.message}
            </h4>
          </div>
          
          {initStatus.details && (
            <ul className="space-y-1">
              {initStatus.details.map((detail, index) => (
                <li key={index} className={`text-sm ${
                  initStatus.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Advertencias importantes */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Consideraciones importantes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Esta operación creará roles en Auth0 que no se pueden deshacer fácilmente</li>
              <li>• Asegúrate de tener configuradas las credenciales M2M de Auth0</li>
              <li>• Los permisos se guardarán en las descripciones de los roles</li>
              <li>• El usuario soc@jeturing.com mantendrá acceso completo siempre</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
