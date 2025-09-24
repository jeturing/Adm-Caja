import React from 'react';

const Videos: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🎬 Gestión de Videos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administra el contenido de video de La Cajita TV
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Total de Videos
            </h3>
            <span className="text-3xl">📹</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Videos disponibles
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Duración Total
            </h3>
            <span className="text-3xl">⏱️</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">0h</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Horas de contenido
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Populares
            </h3>
            <span className="text-3xl">🔥</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Videos trending
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Lista de Videos
        </h2>
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📺</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay videos disponibles
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Conecta con la API para cargar el contenido de video
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            🔄 Cargar Videos desde API
          </button>
        </div>
      </div>
    </div>
  );
};

export default Videos;
