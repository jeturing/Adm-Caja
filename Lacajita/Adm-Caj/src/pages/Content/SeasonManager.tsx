import React, { useState, useEffect } from 'react';
import { realApiService, ApiSeason } from '../../services/realApiService';
import SeasonForm from '../../components/content/SeasonForm';
import ContentNavigation from '../../components/content/ContentNavigation';

const SeasonManager: React.FC = () => {
  const [seasons, setSeasons] = useState<ApiSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<ApiSeason | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      setError('');
      const seasonsData = await realApiService.getSeasons();
      setSeasons(seasonsData);
      console.log('✅ Seasons cargadas:', seasonsData.length);
    } catch (error: any) {
      console.error('❌ Error cargando seasons:', error);
      setError('Error al cargar las seasons. Verifique la conexión con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = () => {
    setEditingSeason(null);
    setShowForm(true);
  };

  const handleEditSeason = (season: ApiSeason) => {
    setEditingSeason(season);
    setShowForm(true);
  };

  const handleDeleteSeason = async (seasonId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta season?')) {
      return;
    }

    try {
      await realApiService.deleteSeason(seasonId);
      await loadSeasons(); // Recargar la lista
      console.log('✅ Season eliminada:', seasonId);
    } catch (error) {
      console.error('❌ Error eliminando season:', error);
      setError('Error al eliminar la season.');
    }
  };

  const handleSaveSeason = async (season: ApiSeason) => {
    setShowForm(false);
    setEditingSeason(null);
    await loadSeasons(); // Recargar la lista
    console.log('✅ Season guardada:', season.id);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSeason(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrar seasons
  const filteredSeasons = seasons.filter(season => {
    const matchesSearch = season.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         season.id?.toString().includes(searchTerm.toLowerCase()) ||
                         season.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         season.playlist_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlaylist = !selectedPlaylist || season.playlist_id === selectedPlaylist;
    
    return matchesSearch && matchesPlaylist;
  });

  // Obtener estadísticas
  const stats = {
    total: seasons.length,
    active: seasons.filter(s => s.active === 1).length,
    inactive: seasons.filter(s => s.active === 0).length,
    playlists: [...new Set(seasons.map(s => s.playlist_id).filter(Boolean))].length
  };

  // Obtener playlists únicas para el filtro
  const uniquePlaylists = [...new Set(seasons.map(s => s.playlist_id).filter(Boolean))];

  if (showForm) {
    return (
      <SeasonForm
        season={editingSeason || undefined}
        onSave={handleSaveSeason}
        onCancel={handleCancelForm}
        isEditing={!!editingSeason}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navegación de contenido */}
        <ContentNavigation />

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📺 Gestión de Seasons
              </h1>
              <p className="text-gray-600">
                Administra las temporadas de contenido de La Cajita TV
              </p>
            </div>
            <button
              onClick={handleCreateSeason}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nueva Season</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📺</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Seasons</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activas</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactivas</p>
                <p className="text-2xl font-semibold text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Playlists</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.playlists}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar seasons
              </label>
              <input
                type="text"
                placeholder="Buscar por título, ID, playlist o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Playlist
              </label>
              <select
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las playlists</option>
                {uniquePlaylists.map((playlistId) => (
                  <option key={playlistId} value={playlistId}>
                    {playlistId}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPlaylist('');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de seasons */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">⏳ Cargando seasons...</div>
            </div>
          ) : filteredSeasons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Season
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Playlist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSeasons.map((season) => (
                    <tr key={season.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {season.title || `Season ${season.id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {season.id}
                          </div>
                          {season.description && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                              {season.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {Array.isArray(season.videos) ? `${season.videos.length} episodio(s)` : '0 episodio(s)'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {season.playlist_id || 'Sin asignar'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(season.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          season.active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {season.active === 1 ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={`/videos?season=${season.id}`}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                            title="Ver videos de esta season"
                          >
                            🎬
                          </a>
                          <button
                            onClick={() => handleEditSeason(season)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSeason(season.id!)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">📺 No hay seasons disponibles</div>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedPlaylist
                  ? 'No se encontraron seasons que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primera season.'}
              </p>
              {!searchTerm && !selectedPlaylist && (
                <button
                  onClick={handleCreateSeason}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Crear primera season
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Mostrando {filteredSeasons.length} de {seasons.length} seasons
        </div>
      </div>
    </div>
  );
};

export default SeasonManager;
