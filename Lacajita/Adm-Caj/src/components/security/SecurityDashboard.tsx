import React, { useState, useEffect } from 'react';
import { User, Auth0Role } from '../../types/permissions';

interface SecurityStatsProps {
  users: User[];
  roles: Auth0Role[];
  onRefresh: () => void;
}

interface SecurityStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalRoles: number;
  usersWithRoles: number;
  usersWithoutRoles: number;
  totalLogins: number;
  avgLoginsPerUser: number;
  lastWeekLogins: number;
}

const SecurityDashboard: React.FC<SecurityStatsProps> = ({ users, roles, onRefresh }) => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStats();
  }, [users, roles]);

  const calculateStats = async () => {
    setLoading(true);
    try {
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.isActive).length;
      const inactiveUsers = totalUsers - activeUsers;
      const verifiedUsers = users.filter(u => u.auth0Data?.email_verified).length;
      const unverifiedUsers = totalUsers - verifiedUsers;
      const totalRoles = roles.length;
      const usersWithRoles = users.filter(u => u.roles.length > 0).length;
      const usersWithoutRoles = totalUsers - usersWithRoles;
      
      // Calcular estadísticas de logins
      const totalLogins = users.reduce((sum, user) => sum + (user.auth0Data?.logins_count || 0), 0);
      const avgLoginsPerUser = totalUsers > 0 ? Math.round(totalLogins / totalUsers) : 0;
      
      // Simular logins de la última semana (esto requeriría datos más detallados de Auth0)
      const lastWeekLogins = Math.round(totalLogins * 0.1); // Estimación

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        verifiedUsers,
        unverifiedUsers,
        totalRoles,
        usersWithRoles,
        usersWithoutRoles,
        totalLogins,
        avgLoginsPerUser,
        lastWeekLogins
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">📊 Panel de Estadísticas</h3>
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
          <div className="text-sm text-blue-800">Total Usuarios</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          <div className="text-sm text-green-800">Usuarios Activos</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.totalRoles}</div>
          <div className="text-sm text-purple-800">Roles Creados</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.totalLogins}</div>
          <div className="text-sm text-orange-800">Total Logins</div>
        </div>
      </div>

      {/* Gráficos de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado de usuarios */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-4">👥 Estado de Usuarios</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Activos</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{stats.activeUsers}</span>
                <div className="w-16 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-green-500 rounded" 
                    style={{ width: `${(stats.activeUsers / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Inactivos</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{stats.inactiveUsers}</span>
                <div className="w-16 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-red-500 rounded" 
                    style={{ width: `${(stats.inactiveUsers / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Verificados</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{stats.verifiedUsers}</span>
                <div className="w-16 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-blue-500 rounded" 
                    style={{ width: `${(stats.verifiedUsers / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribución de roles */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-4">🔰 Distribución de Roles</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Con roles</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{stats.usersWithRoles}</span>
                <div className="w-16 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-purple-500 rounded" 
                    style={{ width: `${(stats.usersWithRoles / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Sin roles</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">{stats.usersWithoutRoles}</span>
                <div className="w-16 h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-gray-400 rounded" 
                    style={{ width: `${(stats.usersWithoutRoles / stats.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.avgLoginsPerUser}</div>
                <div className="text-xs text-gray-500">Promedio logins por usuario</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas y recomendaciones */}
      <div className="mt-6 space-y-3">
        {stats.unverifiedUsers > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-2">⚠️</div>
              <span className="text-sm text-yellow-800">
                Hay {stats.unverifiedUsers} usuario(s) sin verificar su email.
              </span>
            </div>
          </div>
        )}

        {stats.usersWithoutRoles > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-blue-600 mr-2">ℹ️</div>
              <span className="text-sm text-blue-800">
                {stats.usersWithoutRoles} usuario(s) no tienen roles asignados.
              </span>
            </div>
          </div>
        )}

        {stats.inactiveUsers > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">🚫</div>
              <span className="text-sm text-red-800">
                {stats.inactiveUsers} usuario(s) están bloqueados o inactivos.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;
