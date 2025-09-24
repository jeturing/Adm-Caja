import React from 'react';

const Segments: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📂 Gestión de Segmentos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administra los segmentos y clips de contenido
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Total Segmentos
            </h3>
            <span className="text-3xl">🎬</span>
          </div>
          <p className="text-3xl font-bold text-teal-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Segmentos disponibles
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Duración Media
            </h3>
            <span className="text-3xl">⏰</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">0m</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Minutos promedio
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Categorías
            </h3>
            <span className="text-3xl">🏷️</span>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-2">0</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tipos diferentes
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Más Visto
            </h3>
            <span className="text-3xl">👁️</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mb-2">-</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Segmento popular
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Segmentos de Contenido
            </h2>
            <div className="flex gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700">
                <option>Todas las categorías</option>
                <option>Noticias</option>
                <option>Entretenimiento</option>
                <option>Deportes</option>
                <option>Cultura</option>
              </select>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                ➕ Nuevo Segmento
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🎞️</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay segmentos disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primer segmento o carga desde la API
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                🔄 Cargar desde API
              </button>
              <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                ✂️ Crear Segmento
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ✂️ Tipos de Segmentos
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Clips destacados</li>
            <li>• Fragmentos temáticos</li>
            <li>• Avances y trailers</li>
            <li>• Momentos especiales</li>
          </ul>
        </div>

        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
            🎯 Gestión
          </h3>
          <ul className="text-sm text-cyan-700 dark:text-cyan-300 space-y-1">
            <li>• Edición de metadatos</li>
            <li>• Control de duración</li>
            <li>• Categorización automática</li>
            <li>• Etiquetado inteligente</li>
          </ul>
        </div>

        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-200 mb-2">
            📊 Analytics
          </h3>
          <ul className="text-sm text-rose-700 dark:text-rose-300 space-y-1">
            <li>• Estadísticas de visualización</li>
            <li>• Tiempo de reproducción</li>
            <li>• Engagement del usuario</li>
            <li>• Reportes de popularidad</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Segments;
