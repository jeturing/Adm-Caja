/**
 * Componente para mostrar videos reales usando video IDs de La Cajita API + JWPlayer CDN
 * Integra los video IDs obtenidos de la API con el CDN de JWPlayer
 */

import React, { useState, useEffect } from 'react';
import { realApiService, ApiVideo } from '../../services/realApiService';
import { JWPlayerCDNService, JWPlayerVideo } from '../../services/jwPlayerCDNService';

interface VideoWithJWPlayer extends ApiVideo {
  jwPlayerData?: JWPlayerVideo;
  jwPlayerError?: string;
  loading?: boolean;
}

const RealVideoViewer: React.FC = () => {
  const [videos, setVideos] = useState<VideoWithJWPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithJWPlayer | null>(null);
  const [loadingJWPlayer, setLoadingJWPlayer] = useState<Set<string>>(new Set());

  const jwPlayerService = new JWPlayerCDNService();

  // Cargar videos desde La Cajita API
  const loadVideosFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎬 Cargando videos desde La Cajita API...');
      const apiVideos = await realApiService.getVideos(1); // Solo activos
      
      console.log(`✅ ${apiVideos.length} videos cargados desde API`);
      setVideos(apiVideos.map(video => ({ ...video, loading: false })));
      
    } catch (err) {
      console.error('❌ Error cargando videos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de JWPlayer CDN para un video específico
  const loadJWPlayerData = async (video: VideoWithJWPlayer) => {
    if (!video.id || loadingJWPlayer.has(video.id)) {
      return;
    }

    try {
      console.log(`🔍 Cargando datos de JWPlayer para video: ${video.id}`);
      
      // Marcar como loading
      setLoadingJWPlayer(prev => new Set(prev).add(video.id));
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, loading: true, jwPlayerError: undefined }
          : v
      ));

      // Primero verificar si la playlist está disponible
      const available = await jwPlayerService.isPlaylistAvailable(video.id);
      
      if (!available) {
        throw new Error(`Video ${video.id} no está disponible en JWPlayer CDN`);
      }

      // Intentar obtener datos desde JWPlayer CDN
      const jwPlayerData = await jwPlayerService.fetchPlaylistData(video.id);
      
      if (jwPlayerData && jwPlayerData.playlist && jwPlayerData.playlist.length > 0) {
        const videoData = jwPlayerData.playlist[0]; // Primer video de la playlist
        
        console.log(`✅ Datos de JWPlayer obtenidos para ${video.id}:`, videoData);
        
        setVideos(prev => prev.map(v => 
          v.id === video.id 
            ? { ...v, jwPlayerData: videoData, loading: false }
            : v
        ));
      } else {
        throw new Error('Playlist vacía o formato incorrecto');
      }
      
    } catch (err) {
      console.error(`❌ Error cargando JWPlayer data para ${video.id}:`, err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error de conexión con JWPlayer CDN';
      
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { 
              ...v, 
              jwPlayerError: errorMessage,
              loading: false 
            }
          : v
      ));
    } finally {
      setLoadingJWPlayer(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.id);
        return newSet;
      });
    }
  };

  // Cargar automáticamente datos de JWPlayer para los primeros videos
  const loadJWPlayerDataForAll = async () => {
    console.log('🚀 Cargando datos de JWPlayer para videos seleccionados...');
    
    // Cargar solo los primeros 5 para no sobrecargar el CDN
    const videosToLoad = videos.slice(0, 5);
    
    for (const video of videosToLoad) {
      await loadJWPlayerData(video);
      // Delay más largo para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  useEffect(() => {
    loadVideosFromAPI();
  }, []);

  useEffect(() => {
    if (videos.length > 0 && videos.every(v => !v.loading)) {
      // Auto-cargar JWPlayer data deshabilitado por defecto
      // Usar el botón "📺 Cargar JWPlayer" para cargar manualmente
      console.log('✅ Videos cargados desde API. Usa el botón para cargar datos de JWPlayer.');
    }
  }, [videos.length]);

  const openVideoModal = (video: VideoWithJWPlayer) => {
    setSelectedVideo(video);
    if (!video.jwPlayerData && !video.jwPlayerError) {
      loadJWPlayerData(video);
    }
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando videos desde La Cajita API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">❌ Error cargando videos</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadVideosFromAPI}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎬 Videos Reales - La Cajita TV
            </h2>
            <p className="text-gray-600">
              Videos desde API ({videos.length}) + JWPlayer CDN
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={loadVideosFromAPI}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Actualizar API
            </button>
            <button
              onClick={loadJWPlayerDataForAll}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📺 Cargar JWPlayer
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <div 
            key={video.id} 
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => openVideoModal(video)}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-100 relative">
              {video.jwPlayerData?.image ? (
                <img
                  src={video.jwPlayerData.image}
                  alt={video.jwPlayerData.title || video.id}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQuNSA3NkwxNjkuNSA5MEwxNDQuNSAxMDRWNzZaIiBmaWxsPSIjOUI5Qjk4Ii8+Cjwvc3ZnPgo=';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  {video.loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  ) : (
                    <div className="text-gray-400 text-center">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                      <p className="text-sm">Video ID: {video.id}</p>
                    </div>
                  )}
                </div>
              )}
              
              {video.jwPlayerData?.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(video.jwPlayerData.duration)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                {video.jwPlayerData?.title || video.title || `Video ${video.id}`}
              </h3>
              
              <div className="text-sm text-gray-500 space-y-1">
                <div>ID: {video.id}</div>
                <div>Season: {video.season_id}</div>
                {video.created_at && (
                  <div>Fecha: {new Date(video.created_at).toLocaleDateString()}</div>
                )}
              </div>

              {/* Estado JWPlayer */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                {video.loading ? (
                  <div className="flex items-center text-blue-600 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent mr-2"></div>
                    Cargando JWPlayer...
                  </div>
                ) : video.jwPlayerData ? (
                  <div className="flex items-center text-green-600 text-xs">
                    ✅ JWPlayer disponible
                  </div>
                ) : video.jwPlayerError ? (
                  <div className="text-red-600 text-xs">
                    ❌ {video.jwPlayerError}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadJWPlayerData(video);
                    }}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    📺 Cargar desde JWPlayer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Video */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedVideo.jwPlayerData?.title || selectedVideo.title || `Video ${selectedVideo.id}`}
                </h3>
                <button
                  onClick={closeVideoModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Video Player o Info */}
              {selectedVideo.jwPlayerData?.sources?.[0]?.file ? (
                <div className="mb-4">
                  <video
                    controls
                    className="w-full aspect-video bg-black rounded-lg"
                    poster={selectedVideo.jwPlayerData.image}
                  >
                    <source src={selectedVideo.jwPlayerData.sources[0].file} type="video/mp4" />
                    Tu navegador no soporta el elemento video.
                  </video>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  {selectedVideo.loading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando datos de JWPlayer...</p>
                    </div>
                  ) : selectedVideo.jwPlayerError ? (
                    <div className="text-center text-red-600">
                      <p className="mb-4">❌ Error cargando video desde JWPlayer</p>
                      <p className="text-sm">{selectedVideo.jwPlayerError}</p>
                      <button
                        onClick={() => loadJWPlayerData(selectedVideo)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        🔄 Reintentar
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Video no disponible desde JWPlayer CDN</p>
                      <button
                        onClick={() => loadJWPlayerData(selectedVideo)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        📺 Intentar cargar desde JWPlayer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Información detallada */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📋 Información de La Cajita API</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div><strong>Video ID:</strong> {selectedVideo.id}</div>
                    <div><strong>Season ID:</strong> {selectedVideo.season_id}</div>
                    <div><strong>Estado:</strong> {selectedVideo.active ? '✅ Activo' : '❌ Inactivo'}</div>
                    {selectedVideo.title && (
                      <div><strong>Título:</strong> {selectedVideo.title}</div>
                    )}
                    {selectedVideo.created_at && (
                      <div><strong>Fecha:</strong> {new Date(selectedVideo.created_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>

                {selectedVideo.jwPlayerData && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">📺 Información de JWPlayer</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div><strong>Título:</strong> {selectedVideo.jwPlayerData.title}</div>
                      <div><strong>Media ID:</strong> {selectedVideo.jwPlayerData.mediaid}</div>
                      {selectedVideo.jwPlayerData.duration && (
                        <div><strong>Duración:</strong> {formatDuration(selectedVideo.jwPlayerData.duration)}</div>
                      )}
                      {selectedVideo.jwPlayerData.description && (
                        <div><strong>Descripción:</strong> {selectedVideo.jwPlayerData.description}</div>
                      )}
                      {selectedVideo.jwPlayerData.sources && (
                        <div><strong>Fuentes:</strong> {selectedVideo.jwPlayerData.sources.length} disponibles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealVideoViewer;
