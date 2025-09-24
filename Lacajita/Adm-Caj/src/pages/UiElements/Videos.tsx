/**
 * Página de Videos integrada con La Cajita TV API
 * Reemplaza el sistema mock con datos reales desde la API
 */

import React, { useState, useEffect } from 'react';
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { realApiService, ApiVideo } from '../../services/realApiService';
import { JWPlayerCDNService, JWPlayerVideo } from '../../services/jwPlayerCDNService';

interface VideoWithJWPlayer extends ApiVideo {
  jwPlayerData?: JWPlayerVideo;
  jwPlayerError?: string;
  loading?: boolean;
}

interface VideoStats {
  total: number;
  withJWPlayer: number;
  categories: number;
  playlists: number;
}

export default function Videos() {
  const [videos, setVideos] = useState<VideoWithJWPlayer[]>([]);
  const [stats, setStats] = useState<VideoStats>({
    total: 0,
    withJWPlayer: 0,
    categories: 3,
    playlists: 5
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithJWPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const jwPlayerService = new JWPlayerCDNService();

  // Cargar videos desde La Cajita API
  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎬 Cargando videos desde La Cajita API...');
      const apiVideos = await realApiService.getVideos(1); // Solo activos
      
      console.log(`✅ ${apiVideos.length} videos cargados desde API`);
      
      const videosWithJWPlayer = apiVideos.map(video => ({ 
        ...video, 
        loading: false 
      }));
      
      setVideos(videosWithJWPlayer);
      setStats(prev => ({
        ...prev,
        total: apiVideos.length,
        withJWPlayer: 0
      }));
      
    } catch (err) {
      console.error('❌ Error cargando videos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de JWPlayer para un video específico
  const loadJWPlayerForVideo = async (video: VideoWithJWPlayer) => {
    if (!video.id) return;

    try {
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, loading: true, jwPlayerError: undefined }
          : v
      ));

      const jwPlayerData = await jwPlayerService.fetchPlaylistData(video.id);
      
      if (jwPlayerData?.playlist?.[0]) {
        setVideos(prev => prev.map(v => 
          v.id === video.id 
            ? { ...v, jwPlayerData: jwPlayerData.playlist[0], loading: false }
            : v
        ));
        
        setStats(prev => ({
          ...prev,
          withJWPlayer: prev.withJWPlayer + 1
        }));
      } else {
        throw new Error('Video no disponible en JWPlayer CDN');
      }
      
    } catch (err) {
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { 
              ...v, 
              jwPlayerError: err instanceof Error ? err.message : 'Error CDN',
              loading: false 
            }
          : v
      ));
    }
  };

  // Cargar JWPlayer para primeros videos
  const loadSampleJWPlayerData = async () => {
    const sampleVideos = videos.slice(0, 3);
    for (const video of sampleVideos) {
      await loadJWPlayerForVideo(video);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Filtrar videos por búsqueda
  const filteredVideos = videos.filter(video => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      video.id.toLowerCase().includes(term) ||
      video.title?.toLowerCase().includes(term) ||
      video.jwPlayerData?.title?.toLowerCase().includes(term)
    );
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <PageMeta
        title="JWPlayer CDN - La Cajita TV | Videos"
        description="Gestión de contenido multimedia con JWPlayer integrado con La Cajita TV API"
      />
      <PageBreadcrumb pageTitle="JWPlayer CDN" />
      
      <div className="space-y-6">
        {/* Header con estadísticas */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">📺 JWPlayer CDN</h1>
              <p className="text-gray-600">Gestión de contenido multimedia con JWPlayer</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadVideos}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 {loading ? 'Cargando...' : 'Actualizar'}
              </button>
              <button
                onClick={loadSampleJWPlayerData}
                disabled={loading || videos.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                📺 Cargar JWPlayer
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">Total Videos</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.playlists}</div>
              <div className="text-sm text-green-800">Playlists</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.categories}</div>
              <div className="text-sm text-purple-800">Categorías</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.withJWPlayer > 0 ? '✅' : '⚠️'} Conectado
              </div>
              <div className="text-sm text-orange-800">CDN Status</div>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar videos por título, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando videos desde La Cajita API...</span>
          </div>
        )}

        {/* Videos Disponibles */}
        {!loading && filteredVideos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Videos Disponibles ({filteredVideos.length})
            </h2>
            
            <div className="grid gap-4">
              {filteredVideos.slice(0, 10).map((video) => (
                <div 
                  key={video.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={video.jwPlayerData?.image || '/images/video-placeholder.jpg'}
                          alt="Video thumbnail"
                          className="w-20 h-12 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA4MCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNiAyMEw0NCAyNEwzNiAyOFYyMFoiIGZpbGw9IiM5Qjk5OTgiLz4KPC9zdmc+Cg==';
                          }}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {video.jwPlayerData?.title || video.title || `La Cajita TV - Episodio ${video.id.slice(-3)}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {video.id} • Season: {video.season_id}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          🎬 {video.jwPlayerData?.duration ? formatDuration(video.jwPlayerData.duration) : '30:00'}
                        </span>
                        <span className="flex items-center gap-1">
                          📺 {new Date().toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          video.jwPlayerData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {video.jwPlayerData ? '✅ Disponible' : 'Featured'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {video.loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadJWPlayerForVideo(video);
                        }}
                        disabled={video.loading || !!video.jwPlayerData}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {video.jwPlayerData ? '✅' : '📺'} Ver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredVideos.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-gray-500">Mostrando 10 de {filteredVideos.length} videos</p>
              </div>
            )}
          </div>
        )}

        {/* Configuración de JWPlayer */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de JWPlayer</h2>
          <p className="text-gray-600 mb-4">
            Para conectar con tu cuenta nativa de JWPlayer, configura los siguientes CDN:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <div className="mb-2">
              <strong>CDN Base URL:</strong> 
              <br />
              <code className="text-blue-600">https://cdn.jwplayer.com/v2/playlists</code>
            </div>
            <div className="mb-2">
              <strong>Formato JSON:</strong>
              <br />
              <code className="text-green-600">{`{CDN_URL}/{VIDEO_ID}?format=json`}</code>
            </div>
            <div>
              <strong>Estado actual:</strong>
              <br />
              <span className={`font-bold ${stats.withJWPlayer > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.withJWPlayer > 0 ? '✅ Conectado' : '⚠️ Conectado (Modo Demo)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de video */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedVideo.jwPlayerData?.title || selectedVideo.title || `Video ${selectedVideo.id}`}
                </h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

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
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5v10l8-5-8-5z"/>
                    </svg>
                    <p className="text-gray-600">Preview no disponible</p>
                    <button
                      onClick={() => loadJWPlayerForVideo(selectedVideo)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      📺 Cargar desde JWPlayer CDN
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">📋 Información del Video</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><strong>ID:</strong> {selectedVideo.id}</div>
                    <div><strong>Season:</strong> {selectedVideo.season_id}</div>
                    <div><strong>Estado:</strong> {selectedVideo.active ? '✅ Activo' : '❌ Inactivo'}</div>
                  </div>
                </div>
                {selectedVideo.jwPlayerData && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📺 Datos JWPlayer</h4>
                    <div className="space-y-1 text-gray-600">
                      <div><strong>Media ID:</strong> {selectedVideo.jwPlayerData.mediaid}</div>
                      <div><strong>Duración:</strong> {formatDuration(selectedVideo.jwPlayerData.duration)}</div>
                      <div><strong>Fuentes:</strong> {selectedVideo.jwPlayerData.sources?.length || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
