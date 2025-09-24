import React, { useState, useEffect } from 'react';
import { mockJWPlayerService, MockVideo } from '../../services/mockJWPlayerService';
import { 
  VideoIcon, 
  EyeIcon, 
  GridIcon,
  CheckCircleIcon,
  AlertIcon
} from '../../icons';

const JWPlayerVideos: React.FC = () => {
  const [videos, setVideos] = useState<MockVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MockVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalVideos: 0, totalPlaylists: 0, categories: [] as string[] });
  const [playlistConfig, setPlaylistConfig] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar videos y estadísticas
      const [videosData, statsData, configData] = await Promise.all([
        mockJWPlayerService.getMockVideos(),
        mockJWPlayerService.getStats(),
        Promise.resolve(mockJWPlayerService.getPlaylistConfig())
      ]);

      setVideos(videosData);
      setStats(statsData);
      setPlaylistConfig(configData);
    } catch (error) {
      console.error('Error cargando datos de JWPlayer:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar videos por término de búsqueda
  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (video: MockVideo) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedVideo(null);
    setIsModalOpen(false);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando videos desde JWPlayer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <VideoIcon className="w-8 h-8 text-blue-600 mr-3" />
              JWPlayer CDN
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión de contenido multimedia con JWPlayer
            </p>
          </div>
          
          <div className="flex space-x-4">
            <a
              href="/videos-config"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span>Configurar</span>
            </a>
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <VideoIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Videos</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalVideos}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <GridIcon className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-600 font-medium">Playlists</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalPlaylists}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Categorías</p>
                <p className="text-2xl font-bold text-purple-900">{stats.categories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertIcon className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-yellow-600 font-medium">CDN Status</p>
                <p className="text-sm font-bold text-yellow-900">Conectado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <VideoIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar videos por título, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de Videos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Videos Disponibles ({filteredVideos.length})
          </h2>
        </div>
        
        {filteredVideos.length === 0 ? (
          <div className="p-12 text-center">
            <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron videos' : 'No hay videos disponibles'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Intenta con diferentes términos de búsqueda'
                : 'Configura tus playlist IDs de JWPlayer para ver contenido'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredVideos.map((video) => (
              <div 
                key={video.id} 
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => openModal(video)}
              >
                <div className="flex items-start space-x-4">
                  <img 
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {video.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {video.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {video.category}
                          </span>
                          <span>⏱️ {formatDuration(video.duration)}</span>
                          <span>📅 {video.publishDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <EyeIcon className="w-4 h-4" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Video */}
      {isModalOpen && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedVideo.title}</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <iframe
                    src={selectedVideo.embedUrl}
                    className="w-full h-full rounded-lg"
                    frameBorder="0"
                    allowFullScreen
                    title={selectedVideo.title}
                  />
                </div>
                
                {/* Video Info */}
                <div>
                  <p className="text-gray-700 mb-4">{selectedVideo.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Duración:</span>
                      <span className="ml-2 text-gray-600">{formatDuration(selectedVideo.duration)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Categoría:</span>
                      <span className="ml-2 text-gray-600">{selectedVideo.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Publicado:</span>
                      <span className="ml-2 text-gray-600">{selectedVideo.publishDate.toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Media ID:</span>
                      <span className="ml-2 text-gray-600 font-mono text-xs">{selectedVideo.mediaId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuración de Playlists */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración de JWPlayer
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">
            Para conectar con tus playlists reales de JWPlayer, configura los playlist IDs:
          </p>
          <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded font-mono overflow-x-auto">
            {JSON.stringify(playlistConfig, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JWPlayerVideos;
