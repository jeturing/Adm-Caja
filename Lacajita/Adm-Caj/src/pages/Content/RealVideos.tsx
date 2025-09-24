import React, { useState, useEffect } from 'react';
import { hybridVideoService, EnhancedVideo, HybridVideoStats } from '../../services/realHybridVideoService';
import RealVideoModal from '../../components/video/RealVideoModal';
import { 
  VideoIcon, 
  EyeIcon, 
  GridIcon,
  CheckCircleIcon,
  AlertIcon
} from '../../icons';

const RealVideos: React.FC = () => {
  const [videos, setVideos] = useState<EnhancedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<HybridVideoStats>({
    totalApiVideos: 0,
    totalJWPlayerVideos: 0,
    syncedVideos: 0,
    missingInJWPlayer: 0,
    onlyInAPI: 0,
    availablePlaylists: 0,
    totalPlaylists: 0
  });
  const [selectedVideo, setSelectedVideo] = useState<EnhancedVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | EnhancedVideo['syncStatus']>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar videos y estadísticas en paralelo
      const [videosData, syncData] = await Promise.all([
        hybridVideoService.getEnhancedVideos(),
        hybridVideoService.getSyncStatus()
      ]);

      setVideos(videosData);
      setSyncStatus(syncData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVideoClick = (video: EnhancedVideo) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSyncStatusBadge = (status: EnhancedVideo['syncStatus']) => {
    const configs = {
      synced: { color: 'bg-green-100 text-green-800', text: 'Sincronizado', icon: '✅' },
      missing_jwplayer: { color: 'bg-yellow-100 text-yellow-800', text: 'Falta JWPlayer', icon: '⚠️' },
      api_only: { color: 'bg-blue-100 text-blue-800', text: 'Solo API', icon: '📄' },
      jwplayer_only: { color: 'bg-purple-100 text-purple-800', text: 'Solo JWPlayer', icon: '🎬' }
    };
    
    const config = configs[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: '❓' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  // Filtrar videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.video_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.jwPlayer?.title && video.jwPlayer.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || video.syncStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando videos...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <VideoIcon className="w-8 h-8 mr-3 text-blue-600" />
            Videos con JWPlayer
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de videos integrados con JWPlayer CDN
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            {viewMode === 'table' ? <GridIcon className="w-4 h-4 mr-2" /> : <GridIcon className="w-4 h-4 mr-2" />}
            {viewMode === 'table' ? 'Vista Grid' : 'Vista Tabla'}
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <VideoIcon className="w-10 h-10 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Videos API</p>
              <p className="text-2xl font-bold text-blue-600">{syncStatus.totalApiVideos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CheckCircleIcon className="w-10 h-10 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Videos Sincronizados</p>
              <p className="text-2xl font-bold text-green-600">{syncStatus.syncedVideos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <AlertIcon className="w-10 h-10 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Faltan en JWPlayer</p>
              <p className="text-2xl font-bold text-yellow-600">{syncStatus.missingInJWPlayer}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <VideoIcon className="w-10 h-10 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Playlists Disponibles</p>
              <p className="text-2xl font-bold text-purple-600">
                {syncStatus.availablePlaylists}/{syncStatus.totalPlaylists}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Buscar videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="synced">Sincronizados</option>
              <option value="missing_jwplayer">Faltan en JWPlayer</option>
              <option value="api_only">Solo en API</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            Mostrando {filteredVideos.length} de {videos.length} videos
          </div>
        </div>
      </div>

      {/* Lista de Videos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredVideos.length === 0 ? (
          <div className="p-8 text-center">
            <VideoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron videos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JWPlayer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVideos.map((video) => (
                  <tr key={video.video_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-24">
                          {video.jwPlayer?.thumbnail ? (
                            <img
                              className="h-16 w-24 rounded-lg object-cover"
                              src={video.jwPlayer.thumbnail}
                              alt={video.title}
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-16 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
                              <VideoIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {video.jwPlayer?.title || video.title}
                          </div>
                          <div className="text-sm text-gray-500">ID: {video.video_id}</div>
                          {video.jwPlayer?.playlistId && (
                            <div className="text-xs text-blue-600">
                              Playlist: {video.jwPlayer.playlistId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSyncStatusBadge(video.syncStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        video.jwPlayer?.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {video.jwPlayer?.available ? '✅ Disponible' : '❌ No disponible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {video.jwPlayer?.duration 
                          ? formatDuration(video.jwPlayer.duration)
                          : video.duration || 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleVideoClick(video)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Ver
                        </button>
                        
                        {video.jwPlayer?.embedUrl && (
                          <button
                            onClick={() => video.jwPlayer?.embedUrl && window.open(video.jwPlayer.embedUrl, '_blank')}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <VideoIcon className="w-4 h-4 mr-1" />
                            JWPlayer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <RealVideoModal
        video={selectedVideo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default RealVideos;
