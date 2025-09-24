import React, { useState, useEffect } from 'react';
import { realApiService, ApiPlaylist, ApiPlaylistComplete } from '../../services/realApiService';
import PlaylistForm from '../../components/content/PlaylistForm';
import PlaylistDetailModal from '../../components/content/PlaylistDetailModal';
import ContentNavigation from '../../components/content/ContentNavigation';

const PlaylistManager: React.FC = () => {
  const [playlists, setPlaylists] = useState<ApiPlaylistComplete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<ApiPlaylist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [detailPlaylist, setDetailPlaylist] = useState<ApiPlaylistComplete | null>(null);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    premium: 0,
    categories: [] as string[]
  });

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [playlists]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar datos completos de playlists
      const completeData = await realApiService.getCompletePlaylistData();
      
      // Extraer todas las playlists de todos los segmentos
      const allPlaylists: ApiPlaylistComplete[] = [];
      completeData.segments.forEach(segment => {
        if (segment.playlist) {
          allPlaylists.push(...segment.playlist);
        }
      });
      
      setPlaylists(allPlaylists);
      console.log('✅ Playlists cargadas:', allPlaylists.length);
    } catch (error) {
      console.error('❌ Error cargando playlists:', error);
      setError('Error al cargar las playlists. Verifica la conexión con el backend.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = playlists.length;
    const active = playlists.filter(p => p.active === 1).length;
    const premium = playlists.filter(p => p.subscription && p.subscription > 0).length;
    const categories = [...new Set(playlists.map(p => p.category).filter(Boolean))];
    
    setStats({ total, active, premium, categories });
  };

  const handleCreatePlaylist = () => {
    setEditingPlaylist(null);
    setShowForm(true);
  };

  const handleEditPlaylist = (playlist: ApiPlaylist) => {
    setEditingPlaylist(playlist);
    setShowForm(true);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta playlist?')) {
      return;
    }

    try {
      await realApiService.deletePlaylist(playlistId);
      await loadPlaylists(); // Recargar la lista
      console.log('✅ Playlist eliminada:', playlistId);
    } catch (error) {
      console.error('❌ Error eliminando playlist:', error);
      setError('Error al eliminar la playlist.');
    }
  };

  const handleSavePlaylist = async (playlist: ApiPlaylist) => {
    setShowForm(false);
    setEditingPlaylist(null);
    await loadPlaylists(); // Recargar la lista
    console.log('✅ Playlist guardada:', playlist.id);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPlaylist(null);
  };

  const handleShowDetails = (playlist: ApiPlaylistComplete) => {
    setDetailPlaylist(playlist);
  };

  const handleCloseDetails = () => {
    setDetailPlaylist(null);
  };

  // Filtrar playlists
  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playlist.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playlist.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || playlist.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (showForm) {
    return (
      <PlaylistForm
        playlist={editingPlaylist || undefined}
        onSave={handleSavePlaylist}
        onCancel={handleCancelForm}
        isEditing={!!editingPlaylist}
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
                📋 Gestión de Playlists
              </h1>
              <p className="text-gray-600">
                Administra las playlists de contenido de La Cajita TV
              </p>
            </div>
            <button
              onClick={handleCreatePlaylist}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nueva Playlist</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {loading ? '...' : stats.total}
            </div>
            <div className="text-sm text-gray-600">Total Playlists</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {loading ? '...' : stats.active}
            </div>
            <div className="text-sm text-gray-600">Activas</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {loading ? '...' : stats.premium}
            </div>
            <div className="text-sm text-gray-600">Premium</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {loading ? '...' : stats.categories.length}
            </div>
            <div className="text-sm text-gray-600">Categorías</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, ID o descripción..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏷️ Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {stats.categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadPlaylists}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Playlists */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-lg text-gray-600">🔄 Cargando playlists...</div>
            </div>
          ) : filteredPlaylists.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Playlist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segmento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seasons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suscripción
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
                  {filteredPlaylists.map((playlist) => (
                    <tr key={playlist.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {playlist.title || playlist.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {playlist.id}
                          </div>
                          {playlist.description && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                              {playlist.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {playlist.category || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {playlist.segment_id || 'Sin asignar'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {playlist.seasons?.length || 0} seasons
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {playlist.subscription === 0 ? 'Gratuito' : 
                           playlist.subscription === 1 ? 'Premium' : 'VIP'}
                        </div>
                        {playlist.subscription_cost && playlist.subscription_cost > 0 && (
                          <div className="text-sm text-gray-500">
                            ${playlist.subscription_cost}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          playlist.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {playlist.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleShowDetails(playlist)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Ver detalles"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleEditPlaylist(playlist)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePlaylist(playlist.id)}
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
              <div className="text-gray-500 mb-4">
                {searchTerm || selectedCategory ? 
                  '🔍 No se encontraron playlists con los filtros aplicados' : 
                  '📝 No hay playlists creadas aún'
                }
              </div>
              {!searchTerm && !selectedCategory && (
                <button
                  onClick={handleCreatePlaylist}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Crear primera playlist
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Mostrando {filteredPlaylists.length} de {playlists.length} playlists
        </div>
      </div>

      {/* Modal de detalles */}
      {detailPlaylist && (
        <PlaylistDetailModal
          playlist={detailPlaylist}
          onClose={handleCloseDetails}
          onEdit={(playlist) => {
            handleCloseDetails();
            handleEditPlaylist(playlist);
          }}
          onDelete={async (playlistId) => {
            handleCloseDetails();
            await handleDeletePlaylist(playlistId);
          }}
        />
      )}
    </div>
  );
};

export default PlaylistManager;
