import React from 'react';

const Seasons: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🎭 Gestión de Temporadas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administra las temporadas y episodios de La Cajita TV
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Total Temporadas
            </h3>
            <span className="text-3xl">📺</span>
          </div>
          <p className="text-3xl font-bold text-indigo-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Temporadas disponibles
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Episodios
            </h3>
            <span className="text-3xl">🎬</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total de episodios
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Más Reciente
            </h3>
            <span className="text-3xl">🆕</span>
          </div>
          <p className="text-3xl font-bold text-orange-600 mb-2">-</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Última temporada
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Temporadas Disponibles
            </h2>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              ➕ Nueva Temporada
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎪</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay temporadas disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primera temporada o sincroniza desde la API
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                🔄 Sincronizar API
              </button>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                📅 Crear Temporada
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            📋 Estructura de Temporadas
          </h3>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• Cada temporada contiene múltiples episodios</li>
            <li>• Los episodios están organizados cronológicamente</li>
            <li>• Metadatos incluyen fecha, duración y descripción</li>
          </ul>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
            🎯 Funcionalidades
          </h3>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
            <li>• Gestión de episodios por temporada</li>
            <li>• Control de acceso y permisos</li>
            <li>• Integración con sistema de playlists</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Seasons;
