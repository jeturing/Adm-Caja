/**
 * Componente de configuración rápida para JWPlayer CDN
 * Permite configurar fácilmente la integración con La Cajita TV API
 */

import React, { useState, useEffect } from 'react';
import { realApiService } from '../../services/realApiService';
import { JWPlayerCDNService } from '../../services/jwPlayerCDNService';

interface CDNTestResult {
  videoId: string;
  success: boolean;
  title?: string;
  duration?: number;
  sources?: number;
  error?: string;
}

const JWPlayerQuickConfig: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<CDNTestResult[]>([]);
  const [apiVideos, setApiVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const jwPlayerService = new JWPlayerCDNService();

  // Cargar videos de la API
  const loadApiVideos = async () => {
    try {
      setLoadingVideos(true);
      const videos = await realApiService.getVideos(1);
      setApiVideos(videos.slice(0, 5)); // Solo los primeros 5 para testing
      console.log('✅ Videos cargados:', videos.length);
    } catch (error) {
      console.error('❌ Error cargando videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Probar conexión con JWPlayer CDN
  const testJWPlayerConnection = async () => {
    if (apiVideos.length === 0) {
      await loadApiVideos();
      return;
    }

    setTesting(true);
    setTestResults([]);

    console.log('🧪 Iniciando pruebas de JWPlayer CDN...');

    const results: CDNTestResult[] = [];

    for (const video of apiVideos) {
      try {
        console.log(`🔍 Probando video ID: ${video.id}`);
        
        const data = await jwPlayerService.fetchPlaylistData(video.id);
        
        if (data?.playlist?.[0]) {
          const videoData = data.playlist[0];
          results.push({
            videoId: video.id,
            success: true,
            title: videoData.title,
            duration: videoData.duration,
            sources: videoData.sources?.length || 0
          });
          console.log(`✅ Éxito: ${video.id}`);
        } else {
          results.push({
            videoId: video.id,
            success: false,
            error: 'Playlist vacía o formato incorrecto'
          });
          console.log(`❌ Fallo: ${video.id} - Playlist vacía`);
        }
      } catch (error) {
        results.push({
          videoId: video.id,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        console.log(`❌ Fallo: ${video.id} - ${error}`);
      }

      setTestResults([...results]);
      
      // Pequeño delay para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTesting(false);
    console.log('🏁 Pruebas completadas:', results);
  };

  useEffect(() => {
    loadApiVideos();
  }, []);

  const successCount = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ⚙️ Configuración Rápida JWPlayer CDN
        </h2>
        <p className="text-gray-600">
          Configura y prueba la integración entre La Cajita TV API y JWPlayer CDN
        </p>
      </div>

      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-blue-600">
            {apiVideos.length}
          </div>
          <div className="text-sm text-blue-800">Videos en API</div>
          {loadingVideos && (
            <div className="mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-green-600">
            {successCount}/{totalTests}
          </div>
          <div className="text-sm text-green-800">CDN Disponibles</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-purple-600">
            {import.meta.env.VITE_JWPLAYER_CDN_URL ? '✅' : '❌'}
          </div>
          <div className="text-sm text-purple-800">CDN Configurado</div>
        </div>
      </div>

      {/* Configuración CDN */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">📺 Configuración JWPlayer CDN</h3>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <strong>CDN Base URL:</strong>
              <div className="font-mono text-blue-600 mt-1">
                {import.meta.env.VITE_JWPLAYER_CDN_URL || 'No configurado'}
              </div>
            </div>
            
            <div>
              <strong>Formato de Playlist:</strong>
              <div className="font-mono text-green-600 mt-1">
                {`{CDN_URL}/{VIDEO_ID}?format=json`}
              </div>
            </div>

            <div>
              <strong>API Base URL:</strong>
              <div className="font-mono text-orange-600 mt-1">
                {import.meta.env.VITE_API_BASE_URL || 'No configurado'}
              </div>
            </div>
          </div>
        </div>

        {/* Ejemplo de configuración */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Configuración recomendada en .env:</h4>
          <pre className="text-sm text-blue-800 bg-blue-100 p-3 rounded overflow-x-auto">
{`# JWPlayer CDN Configuration
VITE_JWPLAYER_CDN_URL=https://cdn.jwplayer.com/v2/playlists

# La Cajita TV API
VITE_API_BASE_URL=https://b5f8a23e7d06c2de5ef515ae93e16016.sajet.us`}
          </pre>
        </div>
      </div>

      {/* Controles de prueba */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">🧪 Pruebas de Conectividad</h3>
        
        <div className="flex gap-4">
          <button
            onClick={loadApiVideos}
            disabled={loadingVideos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingVideos ? '🔄 Cargando...' : '📡 Cargar Videos API'}
          </button>
          
          <button
            onClick={testJWPlayerConnection}
            disabled={testing || apiVideos.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {testing ? '🧪 Probando...' : '📺 Probar JWPlayer CDN'}
          </button>
        </div>
      </div>

      {/* Resultados de pruebas */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">📊 Resultados de Pruebas</h3>
          
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={`${result.videoId}-${index}`}
                className={`border rounded-lg p-3 ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {result.videoId}
                    </span>
                    {result.success ? (
                      <span className="text-green-600 text-sm">✅ Disponible</span>
                    ) : (
                      <span className="text-red-600 text-sm">❌ No disponible</span>
                    )}
                  </div>
                  
                  {result.success && (
                    <div className="text-sm text-gray-600">
                      {result.sources} fuentes • {Math.floor((result.duration || 0) / 60)}min
                    </div>
                  )}
                </div>
                
                {result.title && (
                  <div className="mt-2 text-sm text-gray-700">
                    📺 {result.title}
                  </div>
                )}
                
                {result.error && (
                  <div className="mt-2 text-sm text-red-600">
                    ❌ {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">📈 Resumen</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Total probados:</strong> {totalTests}
              </div>
              <div>
                <strong>Exitosos:</strong> <span className="text-green-600">{successCount}</span>
              </div>
              <div>
                <strong>Fallidos:</strong> <span className="text-red-600">{totalTests - successCount}</span>
              </div>
              <div>
                <strong>Tasa de éxito:</strong> {totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">📝 Instrucciones</h4>
        <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
          <li>Asegúrate de que las variables de entorno estén configuradas correctamente</li>
          <li>Haz clic en "📡 Cargar Videos API" para obtener video IDs de La Cajita</li>
          <li>Haz clic en "📺 Probar JWPlayer CDN" para verificar conectividad</li>
          <li>Revisa los resultados para identificar videos disponibles</li>
          <li>Los videos exitosos estarán disponibles para reproducción</li>
        </ol>
      </div>
    </div>
  );
};

export default JWPlayerQuickConfig;
