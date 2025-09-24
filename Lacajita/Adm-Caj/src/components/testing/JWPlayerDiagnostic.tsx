/**
 * Componente de diagnóstico para JWPlayer CDN
 * Prueba la conectividad y funcionalidad del CDN de JWPlayer
 */

import React, { useState } from 'react';
import { JWPlayerCDNService, JWPlayerPlaylistResponse } from '../../services/jwPlayerCDNService';

interface TestResult {
  videoId: string;
  available: boolean;
  data?: JWPlayerPlaylistResponse;
  error?: string;
  loading: boolean;
}

const JWPlayerDiagnostic: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [customVideoId, setCustomVideoId] = useState('');

  const service = new JWPlayerCDNService();

  // Video IDs conocidos de La Cajita API
  const KNOWN_VIDEO_IDS = [
    'O9CLAplo',
    'KhYF5ak3', 
    '1s5Vve98',
    'xfCkH0LR',
    'TXGHblqN'
  ];

  const testVideoId = async (videoId: string): Promise<TestResult> => {
    const result: TestResult = {
      videoId,
      available: false,
      loading: true
    };

    try {
      console.log(`🔍 Probando video ID: ${videoId}`);
      
      // Verificar disponibilidad
      const available = await service.isPlaylistAvailable(videoId);
      result.available = available;
      
      if (available) {
        // Obtener datos completos
        const data = await service.fetchPlaylistData(videoId);
        result.data = data || undefined;
      }
      
    } catch (error) {
      console.error(`❌ Error probando ${videoId}:`, error);
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      result.loading = false;
    }

    return result;
  };

  const runDiagnostic = async () => {
    setTesting(true);
    setTestResults([]);
    
    console.log('🧪 Iniciando diagnóstico de JWPlayer CDN...');
    
    const results: TestResult[] = [];
    
    for (const videoId of KNOWN_VIDEO_IDS) {
      // Agregar resultado inicial con loading
      const initialResult: TestResult = {
        videoId,
        available: false,
        loading: true
      };
      
      setTestResults(prev => [...prev, initialResult]);
      
      // Ejecutar prueba
      const result = await testVideoId(videoId);
      
      // Actualizar resultado
      setTestResults(prev => 
        prev.map(r => r.videoId === videoId ? result : r)
      );
      
      results.push(result);
      
      // Pequeño delay para no saturar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
    console.log('✅ Diagnóstico completado:', results);
  };

  const testCustomVideoId = async () => {
    if (!customVideoId.trim()) return;
    
    const result = await testVideoId(customVideoId.trim());
    setTestResults(prev => [...prev, result]);
    setCustomVideoId('');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🔧 Diagnóstico JWPlayer CDN
        </h2>
        <p className="text-gray-600">
          Prueba la conectividad y funcionalidad del CDN de JWPlayer con video IDs reales
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={runDiagnostic}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? '🔄 Probando...' : '🧪 Ejecutar Diagnóstico'}
        </button>
        
        <button
          onClick={clearResults}
          disabled={testing}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          🗑️ Limpiar Resultados
        </button>
      </div>

      {/* Custom Video ID Test */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Probar Video ID Personalizado</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customVideoId}
            onChange={(e) => setCustomVideoId(e.target.value)}
            placeholder="Ej: O9CLAplo"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={testCustomVideoId}
            disabled={!customVideoId.trim() || testing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            🔍 Probar
          </button>
        </div>
      </div>

      {/* Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">📊 Resultados</h3>
          
          <div className="grid gap-4">
            {testResults.map((result, index) => (
              <div
                key={`${result.videoId}-${index}`}
                className={`border rounded-lg p-4 ${
                  result.loading 
                    ? 'border-blue-200 bg-blue-50' 
                    : result.available 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {result.videoId}
                    </span>
                    {result.loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    {result.loading ? (
                      <span className="text-blue-600">🔄 Probando...</span>
                    ) : result.available ? (
                      <span className="text-green-600">✅ Disponible</span>
                    ) : (
                      <span className="text-red-600">❌ No disponible</span>
                    )}
                  </div>
                </div>

                {result.error && (
                  <div className="text-red-600 text-sm mb-2">
                    ❌ Error: {result.error}
                  </div>
                )}

                {result.data && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700">
                      <strong>Título:</strong> {result.data.title}
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      <strong>Videos en playlist:</strong> {result.data.playlist?.length || 0}
                    </div>

                    {result.data.playlist && result.data.playlist.length > 0 && (
                      <div className="bg-white rounded border p-3 text-sm">
                        <div className="font-medium text-gray-900 mb-1">
                          📺 Primer video:
                        </div>
                        <div className="space-y-1 text-gray-600">
                          <div><strong>Título:</strong> {result.data.playlist[0].title}</div>
                          <div><strong>Media ID:</strong> {result.data.playlist[0].mediaid}</div>
                          {result.data.playlist[0].duration && (
                            <div><strong>Duración:</strong> {result.data.playlist[0].duration}s</div>
                          )}
                          <div><strong>Thumbnail:</strong> {result.data.playlist[0].image ? '✅' : '❌'}</div>
                          <div><strong>Fuentes:</strong> {result.data.playlist[0].sources?.length || 0}</div>
                          {result.data.playlist[0].image && (
                            <div className="mt-2">
                              <img 
                                src={result.data.playlist[0].image} 
                                alt="Thumbnail"
                                className="w-32 h-18 object-cover rounded border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 space-y-1">
                      <div><strong>JSON URL:</strong> 
                        <br />
                        <a 
                          href={service.getPlaylistJsonUrl(result.videoId)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {service.getPlaylistJsonUrl(result.videoId)}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información</h4>
        <div className="text-blue-800 text-sm space-y-1">
          <p>• Este diagnóstico prueba la conectividad con el CDN de JWPlayer</p>
          <p>• Los video IDs provienen de La Cajita API</p>
          <p>• Un video "disponible" significa que el CDN responde correctamente</p>
          <p>• Los resultados ayudan a diagnosticar problemas de integración</p>
        </div>
      </div>
    </div>
  );
};

export default JWPlayerDiagnostic;
