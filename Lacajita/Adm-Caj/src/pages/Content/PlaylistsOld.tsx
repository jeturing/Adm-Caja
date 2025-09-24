import React from 'react';

const Playlists: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📋 Gestión de Playlists
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Organiza y administra las listas de reproducción
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Playlists
            </h3>
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Listas creadas
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Videos Total
            </h3>
            <span className="text-3xl">🎞️</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            En todas las listas
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Más Popular
            </h3>
            <span className="text-3xl">⭐</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-2">-</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Playlist favorita
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Categorías
            </h3>
            <span className="text-3xl">🏷️</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Diferentes tipos
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Playlists Disponibles
            </h2>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              ➕ Nueva Playlist
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎵</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay playlists disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primera playlist o carga desde la API
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                🔄 Cargar desde API
              </button>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                📋 Crear Nueva
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
          💡 Sobre las Playlists
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Las playlists organizan el contenido en categorías temáticas</li>
          <li>• Puedes agregar videos, segmentos y temporadas</li>
          <li>• Cada playlist puede tener metadatos personalizados</li>
          <li>• La API sincroniza automáticamente el contenido</li>
        </ul>
      </div>
    </div>
  );
};

export default Playlists;
