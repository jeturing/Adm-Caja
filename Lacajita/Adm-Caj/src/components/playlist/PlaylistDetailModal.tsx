import React, { useState, useEffect } from 'react';
import { playlistsService, PlaylistWithSeasons } from '../../services/playlistsService';
import { jwPlayerCDNService, JWPlayerVideo } from '../../services/jwPlayerCDNService';
import { VideoIcon, ListIcon } from '../../icons';

interface PlaylistDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
}

const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({
  isOpen,
  onClose,
  playlistId
}) => {
  const [playlist, setPlaylist] = useState<PlaylistWithSeasons | null>(null);
  const [jwPlayerVideos, setJwPlayerVideos] = useState<JWPlayerVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'jwplayer'>('database');

  useEffect(() => {
    if (isOpen && playlistId) {
      loadPlaylistDetail();
    }
  }, [isOpen, playlistId]);

  const loadPlaylistDetail = async () => {
    setLoading(true);
    try {
      // Cargar datos de la base de datos
      const playlistData = await playlistsService.getById(playlistId);
      setPlaylist(playlistData as PlaylistWithSeasons);

      // Cargar videos de JWPlayer
      try {
        const videos = await jwPlayerCDNService.getPlaylistVideos(playlistId);
        setJwPlayerVideos(videos);
      } catch (error) {
        console.warn('No se pudieron cargar videos de JWPlayer:', error);
        setJwPlayerVideos([]);
      }
    } catch (error) {
      console.error('Error cargando detalles de playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Detalles de Playlist
              </h2>
              <p className="text-gray-600 mt-1">ID: {playlistId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando detalles...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Información de la playlist */}
            {playlist && (
              <div className="p-6 bg-gray-50 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{playlist.title}</h3>
                    <p className="text-gray-600 mb-4">{playlist.description}</p>
                    <div className="space-y-2 text-sm">
                      <div><strong>Categoría:</strong> {playlist.category || 'N/A'}</div>
                      <div><strong>Creado:</strong> {formatDate(playlist.created_at)}</div>
                      <div><strong>Actualizado:</strong> {formatDate(playlist.updated_at)}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <strong className="mr-2">Estado:</strong>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        playlist.active === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {playlist.active === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div><strong>Suscripción:</strong> {playlist.subscription === 1 ? 'Requerida' : 'Gratuita'}</div>
                    {playlist.subscription === 1 && (
                      <div><strong>Costo:</strong> ${playlist.subscription_cost}</div>
                    )}
                    <div><strong>Seasons en BD:</strong> {playlist.seasons?.length || 0}</div>
                    <div><strong>Videos en JWPlayer:</strong> {jwPlayerVideos.length}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('database')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'database'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ListIcon className="w-4 h-4 inline mr-2" />
                  Seasons (Base de Datos)
                </button>
                <button
                  onClick={() => setActiveTab('jwplayer')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'jwplayer'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <VideoIcon className="w-4 h-4 inline mr-2" />
                  Videos JWPlayer ({jwPlayerVideos.length})
                </button>
              </nav>
            </div>

            {/* Contenido de tabs */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'database' ? (
                // Tab de Seasons de la base de datos
                <div>
                  {playlist?.seasons && playlist.seasons.length > 0 ? (
                    <div className="space-y-6">
                      {playlist.seasons.map(season => (
                        <div key={season.id} className="bg-white border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-semibold">
                              Temporada {season.season_number}: {season.title}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              season.active === 1 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {season.active === 1 ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          
                          {season.description && (
                            <p className="text-gray-600 mb-3">{season.description}</p>
                          )}
                          
                          <div className="text-sm text-gray-500 mb-3">
                            <div>Creado: {formatDate(season.created_at)}</div>
                            <div>Videos: {season.videos?.length || 0}</div>
                          </div>

                          {season.videos && season.videos.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium mb-2">Videos:</h5>
                              <div className="space-y-2">
                                {season.videos.map(video => (
                                  <div key={video.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                      <div className="font-medium">{video.title}</div>
                                      <div className="text-sm text-gray-500">
                                        Episodio {video.episode_number}
                                        {video.duration && ` • ${formatDuration(video.duration)}`}
                                      </div>
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      video.active === 1 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {video.active === 1 ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ListIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay seasons</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Esta playlist no tiene seasons configuradas en la base de datos.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Tab de videos de JWPlayer
                <div>
                  {jwPlayerVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {jwPlayerVideos.map((video, index) => (
                        <div key={video.mediaid || index} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          {video.image && (
                            <div className="h-48 bg-gray-200">
                              <img
                                src={video.image}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                              {video.title}
                            </h4>
                            
                            {video.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                                {video.description}
                              </p>
                            )}
                            
                            <div className="space-y-1 text-xs text-gray-500">
                              <div><strong>Media ID:</strong> {video.mediaid}</div>
                              {video.duration && (
                                <div><strong>Duración:</strong> {formatDuration(video.duration)}</div>
                              )}
                              {video.pubdate && (
                                <div><strong>Publicado:</strong> {formatDate(new Date(video.pubdate * 1000).toISOString())}</div>
                              )}
                            </div>

                            {video.link && (
                              <div className="mt-3">
                                <a
                                  href={video.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Ver video →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay videos</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Esta playlist no tiene videos disponibles en JWPlayer CDN o no se pudo acceder a ellos.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Sincronización: {playlist?.seasons?.length || 0} seasons en BD, {jwPlayerVideos.length} videos en JWPlayer
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetailModal;
