import React, { useState, useEffect } from 'react';
import { User, Auth0Role, MASTER_ACCOUNT_EMAIL } from '../../types/permissions';
import { auth0ManagementService } from '../../services/auth0ManagementService';

interface RoleTestingManagerProps {
  users: User[];
  roles: Auth0Role[];
  onTestComplete?: () => void;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: {
    userId: string;
    userEmail: string;
    roleId: string;
    roleName: string;
    action: 'assign' | 'remove';
  }[];
}

export const RoleTestingManager: React.FC<RoleTestingManagerProps> = ({
  users,
  roles,
  onTestComplete
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<{
    scenario: string;
    success: boolean;
    steps: {
      step: number;
      description: string;
      success: boolean;
      details?: string;
    }[];
  } | null>(null);

  // Crear escenarios de prueba dinámicamente basados en usuarios y roles disponibles
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([]);

  useEffect(() => {
    if (users.length > 0 && roles.length > 0) {
      generateTestScenarios();
    }
  }, [users, roles]);

  const generateTestScenarios = () => {
    const scenarios: TestScenario[] = [];

    // Obtener usuarios de prueba (excluyendo el master account)
    const testUsers = users.filter(user => user.email !== MASTER_ACCOUNT_EMAIL).slice(0, 3);
    
    if (testUsers.length === 0) {
      console.warn('No hay usuarios disponibles para pruebas');
      return;
    }

    // Escenario 1: Asignación de roles básicos
    if (roles.find(r => r.name === 'Editor') && roles.find(r => r.name === 'Viewer')) {
      scenarios.push({
        id: 'basic_assignment',
        name: 'Asignación Básica de Roles',
        description: 'Asigna roles Editor y Viewer a usuarios de prueba',
        steps: [
          {
            userId: testUsers[0]?.auth0Id || '',
            userEmail: testUsers[0]?.email || '',
            roleId: roles.find(r => r.name === 'Editor')?.id || '',
            roleName: 'Editor',
            action: 'assign'
          },
          {
            userId: testUsers[1]?.auth0Id || '',
            userEmail: testUsers[1]?.email || '',
            roleId: roles.find(r => r.name === 'Viewer')?.id || '',
            roleName: 'Viewer',
            action: 'assign'
          }
        ]
      });
    }

    // Escenario 2: Promoción de usuario
    if (roles.find(r => r.name === 'Viewer') && roles.find(r => r.name === 'Content_Manager')) {
      scenarios.push({
        id: 'user_promotion',
        name: 'Promoción de Usuario',
        description: 'Remueve rol Viewer y asigna Content_Manager',
        steps: [
          {
            userId: testUsers[0]?.auth0Id || '',
            userEmail: testUsers[0]?.email || '',
            roleId: roles.find(r => r.name === 'Viewer')?.id || '',
            roleName: 'Viewer',
            action: 'remove'
          },
          {
            userId: testUsers[0]?.auth0Id || '',
            userEmail: testUsers[0]?.email || '',
            roleId: roles.find(r => r.name === 'Content_Manager')?.id || '',
            roleName: 'Content_Manager',
            action: 'assign'
          }
        ]
      });
    }

    // Escenario 3: Roles múltiples
    if (roles.find(r => r.name === 'Editor') && roles.find(r => r.name === 'Viewer')) {
      scenarios.push({
        id: 'multiple_roles',
        name: 'Asignación de Roles Múltiples',
        description: 'Asigna múltiples roles a un solo usuario',
        steps: [
          {
            userId: testUsers[testUsers.length - 1]?.auth0Id || '',
            userEmail: testUsers[testUsers.length - 1]?.email || '',
            roleId: roles.find(r => r.name === 'Editor')?.id || '',
            roleName: 'Editor',
            action: 'assign'
          },
          {
            userId: testUsers[testUsers.length - 1]?.auth0Id || '',
            userEmail: testUsers[testUsers.length - 1]?.email || '',
            roleId: roles.find(r => r.name === 'Viewer')?.id || '',
            roleName: 'Viewer',
            action: 'assign'
          }
        ]
      });
    }

    // Escenario 4: Limpieza de roles
    scenarios.push({
      id: 'role_cleanup',
      name: 'Limpieza de Roles',
      description: 'Remueve todos los roles de prueba asignados',
      steps: testUsers.flatMap(user => 
        roles.filter(role => role.name !== 'Super_Admin').map(role => ({
          userId: user.auth0Id,
          userEmail: user.email,
          roleId: role.id,
          roleName: role.name,
          action: 'remove' as const
        }))
      )
    });

    setTestScenarios(scenarios);
  };

  const runTestScenario = async () => {
    if (!selectedScenario) return;

    setIsRunningTest(true);
    setTestResults(null);

    try {
      const scenario = testScenarios.find(s => s.id === selectedScenario);
      if (!scenario) {
        throw new Error('Escenario no encontrado');
      }

      console.log(`🧪 Ejecutando escenario de prueba: ${scenario.name}`);
      
      const stepResults: any[] = [];

      // Ejecutar cada paso del escenario
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        
        try {
          console.log(`🔄 Paso ${i + 1}: ${step.action} rol ${step.roleName} ${step.action === 'assign' ? 'a' : 'de'} ${step.userEmail}`);
          
          if (step.action === 'assign') {
            await auth0ManagementService.assignRolesToUser(step.userId, [step.roleId]);
          } else {
            await auth0ManagementService.removeRolesFromUser(step.userId, [step.roleId]);
          }

          stepResults.push({
            step: i + 1,
            description: `${step.action === 'assign' ? 'Asignado' : 'Removido'} rol ${step.roleName} ${step.action === 'assign' ? 'a' : 'de'} ${step.userEmail}`,
            success: true
          });

          console.log(`✅ Paso ${i + 1} completado exitosamente`);
          
          // Pausa entre pasos para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error en paso ${i + 1}:`, error);
          stepResults.push({
            step: i + 1,
            description: `Error en ${step.action} rol ${step.roleName} ${step.action === 'assign' ? 'a' : 'de'} ${step.userEmail}`,
            success: false,
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const allStepsSuccessful = stepResults.every(result => result.success);
      
      setTestResults({
        scenario: scenario.name,
        success: allStepsSuccessful,
        steps: stepResults
      });

      if (onTestComplete) {
        onTestComplete();
      }

    } catch (error) {
      console.error('Error ejecutando escenario de prueba:', error);
      setTestResults({
        scenario: selectedScenario,
        success: false,
        steps: [{
          step: 0,
          description: 'Error general del escenario',
          success: false,
          details: error instanceof Error ? error.message : String(error)
        }]
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  if (testScenarios.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Esperando Datos</h3>
          <p className="text-gray-600">
            Necesitas tener usuarios y roles configurados para ejecutar pruebas de asignación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pruebas de Asignación de Roles</h3>
          <p className="text-sm text-gray-600">Ejecuta escenarios de prueba para validar la asignación de roles</p>
        </div>
        <div className="text-sm text-gray-500">
          {users.length} usuarios • {roles.length} roles
        </div>
      </div>

      {/* Selección de escenario */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-700">Seleccionar Escenario de Prueba:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedScenario === scenario.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-gray-900">{scenario.name}</h5>
                <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {scenario.steps.length} pasos
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
              
              <div className="space-y-1">
                {scenario.steps.slice(0, 3).map((step, index) => (
                  <div key={index} className="text-xs text-gray-500 flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      step.action === 'assign' ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    <span>
                      {step.action === 'assign' ? 'Asignar' : 'Remover'} {step.roleName} 
                      {step.action === 'assign' ? ' a ' : ' de '} 
                      {step.userEmail.split('@')[0]}
                    </span>
                  </div>
                ))}
                {scenario.steps.length > 3 && (
                  <div className="text-xs text-gray-400">
                    ... y {scenario.steps.length - 3} pasos más
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de ejecutar prueba */}
      {selectedScenario && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Escenario seleccionado:</span> {testScenarios.find(s => s.id === selectedScenario)?.name}
            </div>
            <button
              onClick={runTestScenario}
              disabled={isRunningTest}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                       text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              {isRunningTest ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Ejecutando prueba...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ejecutar Prueba</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resultados de la prueba */}
      {testResults && (
        <div className={`mt-6 border rounded-lg p-4 ${
          testResults.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-2 mb-4">
            {testResults.success ? (
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
              testResults.success ? 'text-green-800' : 'text-red-800'
            }`}>
              Prueba de "{testResults.scenario}" {testResults.success ? 'completada exitosamente' : 'falló'}
            </h4>
          </div>
          
          <div className="space-y-2">
            {testResults.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-2">
                {step.success ? (
                  <svg className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <span className={`text-sm ${
                    testResults.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Paso {step.step}: {step.description}
                  </span>
                  {step.details && (
                    <div className="text-xs text-gray-600 mt-1">
                      {step.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertencias importantes */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Importante sobre las pruebas:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Las pruebas modifican roles reales en Auth0</li>
              <li>• Se recomienda ejecutar el escenario de "Limpieza" al finalizar</li>
              <li>• El usuario {MASTER_ACCOUNT_EMAIL} está excluido de las pruebas</li>
              <li>• Estas operaciones pueden afectar el acceso de usuarios reales</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
