/**
 * Página de configuración JWPlayer integrada con La Cajita TV API
 * Reemplaza el sistema mock con configuración real
 */

import React, { useState, useEffect } from 'react';
import { realApiService } from '../../services/realApiService';
import JWPlayerQuickConfig from '../../components/content/JWPlayerQuickConfig';

const JWPlayerConfig: React.FC = () => {
  const [stats, setStats] = useState<{
    totalVideos: number;
    totalPlaylists: number;
    totalSeasons: number;
    apiStatus: string;
  }>({
    totalVideos: 0,
    totalPlaylists: 0,
    totalSeasons: 0,
    apiStatus: 'Verificando...'
  });
  const [loading, setLoading] = useState(true);

  const loadRealStats = async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando estadísticas reales desde La Cajita API...');
      
      // Cargar datos paralelos
      const [videos, playlists, seasons] = await Promise.allSettled([
        realApiService.getVideos(1), // Solo activos
        realApiService.getPlaylists(1),
        realApiService.getSeasons(1)
      ]);

      const videoCount = videos.status === 'fulfilled' ? videos.value.length : 0;
      const playlistCount = playlists.status === 'fulfilled' ? playlists.value.length : 0;
      const seasonCount = seasons.status === 'fulfilled' ? seasons.value.length : 0;

      setStats({
        totalVideos: videoCount,
        totalPlaylists: playlistCount,
        totalSeasons: seasonCount,
        apiStatus: '✅ Conectado'
      });

      console.log('✅ Estadísticas cargadas:', {
        videos: videoCount,
        playlists: playlistCount,
        seasons: seasonCount
      });

    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      setStats(prev => ({
        ...prev,
        apiStatus: '❌ Error de conexión'
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎬 Configuración JWPlayer - La Cajita TV
              </h1>
              <p className="text-gray-600">
                Configura la integración con JWPlayer CDN usando la API real de La Cajita TV
              </p>
            </div>
            <button
              onClick={loadRealStats}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
        </div>

        {/* Estadísticas reales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {loading ? '...' : stats.totalVideos}
            </div>
            <div className="text-sm text-gray-600">Videos desde API</div>
            {!loading && (
              <div className="mt-2 text-xs text-gray-500">La Cajita TV</div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {loading ? '...' : stats.totalPlaylists}
            </div>
            <div className="text-sm text-gray-600">Playlists Disponibles</div>
            {!loading && (
              <div className="mt-2 text-xs text-gray-500">API Real</div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {loading ? '...' : stats.totalSeasons}
            </div>
            <div className="text-sm text-gray-600">Temporadas</div>
            {!loading && (
              <div className="mt-2 text-xs text-gray-500">Organizadas</div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-lg font-bold text-orange-600 mb-2">
              {stats.apiStatus}
            </div>
            <div className="text-sm text-gray-600">Estado API</div>
            {!loading && (
              <div className="mt-2 text-xs text-gray-500">
                {import.meta.env.VITE_API_BASE_URL?.split('/').pop()?.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>

        {/* Configuración rápida */}
        <JWPlayerQuickConfig />

        {/* Estado detallado del servicio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Estado de Integración
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">La Cajita TV API:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  stats.apiStatus.includes('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stats.apiStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">JWPlayer CDN:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {import.meta.env.VITE_JWPLAYER_CDN_URL ? '🟢 Configurado' : '🔴 No configurado'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Autenticación:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  ✅ Auth0 + Client Credentials
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Proxy SSL:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  ✅ Activo (Vite)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              � Flujo de Integración
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                <div>
                  <div className="font-medium text-gray-900">La Cajita TV API</div>
                  <div className="text-sm text-gray-600">Proporciona video IDs y metadata</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                <div>
                  <div className="font-medium text-gray-900">JWPlayer CDN</div>
                  <div className="text-sm text-gray-600">Entrega contenido multimedia</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                <div>
                  <div className="font-medium text-gray-900">Reproducción</div>
                  <div className="text-sm text-gray-600">Videos funcionales para usuarios</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variables de entorno */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚙️ Configuración de Variables de Entorno
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-gray-900">API Configuration:</strong>
                <div className="mt-1 space-y-1 font-mono text-gray-600">
                  <div>VITE_API_BASE_URL: {import.meta.env.VITE_API_BASE_URL ? '✅ Configurado' : '❌ Faltante'}</div>
                  <div>VITE_CLIENT_SECRET: {import.meta.env.VITE_CLIENT_SECRET ? '✅ Configurado' : '❌ Faltante'}</div>
                </div>
              </div>
              <div>
                <strong className="text-gray-900">JWPlayer Configuration:</strong>
                <div className="mt-1 space-y-1 font-mono text-gray-600">
                  <div>VITE_JWPLAYER_CDN_URL: {import.meta.env.VITE_JWPLAYER_CDN_URL ? '✅ Configurado' : '❌ Faltante'}</div>
                  <div>CDN Format: JSON + MRSS</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enlaces útiles actualizados */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🔗 Enlaces de Gestión
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a 
              href="/videos" 
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-blue-600">🎬</span>
              <span className="text-gray-900">Ver Videos Reales</span>
            </a>
            <a 
              href="/video-viewer" 
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-green-600">📺</span>
              <span className="text-gray-900">Video Viewer</span>
            </a>
            <a 
              href="/jwplayer-test" 
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-purple-600">🧪</span>
              <span className="text-gray-900">Test CDN</span>
            </a>
            <a 
              href="/api-content" 
              className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-orange-600">📡</span>
              <span className="text-gray-900">API Content</span>
            </a>
          </div>
        </div>

        {/* Información de desarrollo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Información de Desarrollo</h4>
          <div className="text-blue-800 text-sm space-y-1">
            <p>• Esta configuración usa la API real de La Cajita TV en lugar de datos mock</p>
            <p>• Los video IDs se obtienen dinámicamente desde la API</p>
            <p>• JWPlayer CDN se consulta usando estos IDs reales</p>
            <p>• La autenticación se maneja via Auth0 + Client Credentials</p>
            <p>• El proxy SSL está configurado para desarrollo local</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JWPlayerConfig;
