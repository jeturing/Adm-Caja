import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { realApiService, ApiVideo } from '../../services/realApiService';
import VideoForm from '../../components/content/VideoForm';
import ContentNavigation from '../../components/content/ContentNavigation';

const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ApiVideo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadVideos();
  }, []);

  // Inicializar filtro por season desde query param
  useEffect(() => {
    const seasonFromUrl = searchParams.get('season');
    if (seasonFromUrl) {
      setSelectedSeason(seasonFromUrl);
    }
  }, [searchParams]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const videosData = await realApiService.getVideos();
      setVideos(videosData);
      console.log('✅ Videos cargados:', videosData.length);
    } catch (error: any) {
      console.error('❌ Error cargando videos:', error);
      setError('Error al cargar los videos. Verifique la conexión con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideo = () => {
    setEditingVideo(null);
    setShowForm(true);
  };

  const handleEditVideo = (video: ApiVideo) => {
    setEditingVideo(video);
    setShowForm(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
      return;
    }

    try {
      await realApiService.deleteVideo(videoId);
      await loadVideos(); // Recargar la lista
      console.log('✅ Video eliminado:', videoId);
    } catch (error) {
      console.error('❌ Error eliminando video:', error);
      setError('Error al eliminar el video.');
    }
  };

  const handleSaveVideo = async (video: ApiVideo) => {
    setShowForm(false);
    setEditingVideo(null);
    await loadVideos(); // Recargar la lista
    console.log('✅ Video guardado:', video.id);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVideo(null);
  };

  const getVideoType = (type: number) => {
    switch (type) {
      case 0: return 'Episodio';
      case 1: return 'Trailer';
      case 2: return 'Extras';
      case 3: return 'Detrás de cámaras';
      default: return 'Desconocido';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatFileSize = (sizeInMB: number) => {
    if (!sizeInMB || sizeInMB === 0) return 'N/A';
    if (sizeInMB < 1024) return `${sizeInMB.toFixed(1)} MB`;
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  // Filtrar videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeason = !selectedSeason || video.season_id === selectedSeason;
    const matchesType = !selectedType || video.video_type?.toString() === selectedType;
    
    return matchesSearch && matchesSeason && matchesType;
  });

  // Obtener estadísticas
  const stats = {
    total: videos.length,
    active: videos.filter(v => v.active).length,
    episodes: videos.filter(v => v.video_type === 0).length,
    trailers: videos.filter(v => v.video_type === 1).length,
    seasons: [...new Set(videos.map(v => v.season_id).filter(Boolean))].length
  };

  // Obtener seasons únicas para el filtro
  const uniqueSeasons = [...new Set(videos.map(v => v.season_id).filter(Boolean))];

  if (showForm) {
    return (
      <VideoForm
        video={editingVideo || undefined}
        onSave={handleSaveVideo}
        onCancel={handleCancelForm}
        isEditing={!!editingVideo}
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
                🎬 Gestión de Videos
              </h1>
              <p className="text-gray-600">
                Administra los videos de contenido de La Cajita TV
              </p>
            </div>
            <button
              onClick={handleCreateVideo}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nuevo Video</span>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🎬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Videos</p>
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
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📺</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Episodios</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.episodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">🎭</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trailers</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.trailers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Seasons</p>
                <p className="text-2xl font-semibold text-indigo-600">{stats.seasons}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar videos
              </label>
              <input
                type="text"
                placeholder="Buscar por título, ID o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las seasons</option>
                {uniqueSeasons.map((seasonId) => (
                  <option key={seasonId} value={seasonId}>
                    {seasonId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Tipo
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="0">Episodios</option>
                <option value="1">Trailers</option>
                <option value="2">Extras</option>
                <option value="3">Detrás de cámaras</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSeason('');
                  setSelectedType('');
                  // limpiar query params
                  if (searchParams.has('season')) {
                    searchParams.delete('season');
                    setSearchParams(searchParams);
                  }
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de videos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">⏳ Cargando videos...</div>
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Video
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Season
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calidad
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
                  {filteredVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="h-12 w-16 rounded object-cover mr-4"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {video.title || video.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {video.id}
                            </div>
                            {video.description && (
                              <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                                {video.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {video.language?.toUpperCase()} • {video.format?.toUpperCase()} • {formatFileSize(video.file_size || 0)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {video.season_id || 'Sin asignar'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          video.video_type === 0 ? 'bg-blue-100 text-blue-800' :
                          video.video_type === 1 ? 'bg-yellow-100 text-yellow-800' :
                          video.video_type === 2 ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getVideoType(video.video_type || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(video.duration || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {video.quality || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          video.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {video.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {video.url && (
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Ver video"
                            >
                              ▶️
                            </a>
                          )}
                          <button
                            onClick={() => handleEditVideo(video)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
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
              <div className="text-gray-500 text-lg mb-4">🎬 No hay videos disponibles</div>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedSeason || selectedType
                  ? 'No se encontraron videos que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primer video.'}
              </p>
              {!searchTerm && !selectedSeason && !selectedType && (
                <button
                  onClick={handleCreateVideo}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Crear primer video
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Mostrando {filteredVideos.length} de {videos.length} videos
        </div>
      </div>
    </div>
  );
};

export default VideoManager;
