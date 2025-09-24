import React, { useState, useEffect } from 'react';
import { realApiService, ApiVideo, ApiPlaylist, ApiSeason, CompletePlaylistResponse } from '../../services/realApiService';
import { authService } from '../../services/authService';

const RealContentManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [completeData, setCompleteData] = useState<CompletePlaylistResponse | null>(null);
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [seasons, setSeasons] = useState<ApiSeason[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'playlists' | 'seasons'>('overview');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar si el backend está disponible
      const isAvailable = await realApiService.isBackendAvailable();
      setBackendAvailable(isAvailable);

      if (isAvailable) {
        console.log('✅ Backend disponible, cargando datos...');

        // Cargar datos en paralelo
        const [completeResponse, videosResponse, seasonsResponse] = await Promise.allSettled([
          realApiService.getCompletePlaylistData(),
          realApiService.getVideos(1), // Solo activos
          realApiService.getSeasons(1)  // Solo activos
        ]);

        // Procesar resultados
        if (completeResponse.status === 'fulfilled') {
          setCompleteData(completeResponse.value);
          console.log('📊 Datos completos cargados:', completeResponse.value);
        } else {
          console.error('❌ Error cargando datos completos:', completeResponse.reason);
        }

        if (videosResponse.status === 'fulfilled') {
          setVideos(videosResponse.value);
          console.log('🎬 Videos cargados:', videosResponse.value.length);
        } else {
          console.error('❌ Error cargando videos:', videosResponse.reason);
        }

        if (seasonsResponse.status === 'fulfilled') {
          setSeasons(seasonsResponse.value);
          console.log('📺 Seasons cargadas:', seasonsResponse.value.length);
        } else {
          console.error('❌ Error cargando seasons:', seasonsResponse.reason);
        }

      } else {
        console.warn('⚠️ Backend no disponible');
        setError('Backend API no está disponible. Verifica la conexión.');
      }

    } catch (error) {
      console.error('❌ Error general:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estado del backend */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔌 Estado de Conexión</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 ${backendAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {backendAvailable ? '✅ Conectado' : '❌ Desconectado'}
            </div>
            <div className="text-sm text-gray-600">Backend API</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {import.meta.env.VITE_API_BASE_URL ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-600">Configuración</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              JWT
            </div>
            <div className="text-sm text-gray-600">Autenticación</div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {completeData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Estadísticas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {completeData.homecarousel.length}
              </div>
              <div className="text-sm text-gray-600">Home Carousel</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {completeData.segments.length}
              </div>
              <div className="text-sm text-gray-600">Segmentos</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {videos.length}
              </div>
              <div className="text-sm text-gray-600">Videos</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {seasons.length}
              </div>
              <div className="text-sm text-gray-600">Seasons</div>
            </div>
          </div>
        </div>
      )}

      {/* Segmentos con playlists */}
      {completeData?.segments && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📁 Segmentos y Playlists</h3>
          <div className="space-y-4">
            {completeData.segments.map((segment) => (
              <div key={segment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{segment.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    segment.livetv ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {segment.livetv ? 'Live TV' : 'On Demand'}
                  </span>
                </div>
                
                {segment.playlist && segment.playlist.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-2">
                      {segment.playlist.length} playlist(s):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {segment.playlist.map((playlist) => (
                        <div key={playlist.id} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="font-medium">{playlist.title || playlist.id}</div>
                          <div className="text-gray-600">
                            {playlist.seasons?.length || 0} seasons
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {segment.livetvlist && segment.livetvlist.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-2">
                      {segment.livetvlist.length} canal(es) de TV:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {segment.livetvlist.map((channel) => (
                        <div key={channel.id} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="font-medium">{channel.name}</div>
                          <div className="text-gray-600">Canal #{channel.number}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderVideos = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎬 Videos ({videos.length})</h3>
      {videos.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Season ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {videos.map((video, index) => (
                <tr key={`${video.season_id}-${video.video_id}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {video.video_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {video.season_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {video.date ? new Date(video.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      video.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {video.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No se encontraron videos
        </div>
      )}
    </div>
  );

  const renderSeasons = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📺 Seasons ({seasons.length})</h3>
      {seasons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((season) => (
            <div key={season.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {season.title || `Season ${season.id}`}
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>ID:</strong> {season.id}</div>
                <div><strong>Playlist:</strong> {season.playlist_id}</div>
                {season.description && (
                  <div><strong>Descripción:</strong> {season.description}</div>
                )}
                {season.date && (
                  <div><strong>Fecha:</strong> {new Date(season.date).toLocaleDateString()}</div>
                )}
                <div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    season.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {season.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No se encontraron seasons
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🔗 Conexión API Real - La Cajita TV
              </h1>
              <p className="text-gray-600">
                Conectándose a: {import.meta.env.VITE_API_BASE_URL}
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error de Conexión</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: '📊 Resumen', count: null },
              { id: 'videos', name: '🎬 Videos', count: videos.length },
              { id: 'seasons', name: '📺 Seasons', count: seasons.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-lg text-gray-600">🔄 Cargando datos desde la API...</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'videos' && renderVideos()}
            {activeTab === 'seasons' && renderSeasons()}
          </>
        )}
      </div>
    </div>
  );
};

export default RealContentManager;
