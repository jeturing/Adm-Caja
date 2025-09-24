import React, { useState, useEffect } from 'react';
import { realApiService, ApiCompletePlaylistData } from '../../services/realApiService';
import ContentNavigation from '../../components/content/ContentNavigation';
import ComprehensiveApiTester from '../../components/testing/ComprehensiveApiTester';
import AuthFlowDiagnostic from '../../components/testing/AuthFlowDiagnostic';
import LoginEndpointTester from '../../components/testing/LoginEndpointTester';
import ApiConnectionTest from '../../components/testing/ApiConnectionTest';
import ApiEndpointTester from '../../components/testing/ApiEndpointTester';
import QuickApiTest from '../../components/testing/QuickApiTest';
import AuthMethodTester from '../../components/testing/AuthMethodTester';
import ApiDiscovery from '../../components/testing/ApiDiscovery';
import Auth0TokenTester from '../../components/testing/Auth0TokenTester';

const VideosConfig: React.FC = () => {
  const [data, setData] = useState<ApiCompletePlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  useEffect(() => {
    loadCompleteData();
  }, []);

  const loadCompleteData = async () => {
    try {
      setLoading(true);
      setError('');
      const completeData = await realApiService.getCompletePlaylistData();
      setData(completeData);
      console.log('✅ Estructura completa cargada:', completeData);
    } catch (error: any) {
      console.error('❌ Error cargando estructura completa:', error);
      setError('Error al cargar la configuración desde la API.');
    } finally {
      setLoading(false);
    }
  };

  const getSegmentStats = (segment: any) => {
    const playlistCount = segment.playlist?.length || 0;
    const seasonCount = segment.playlist?.reduce((total: number, playlist: any) => 
      total + (playlist.seasons?.length || 0), 0) || 0;
    const livetvCount = segment.livetvlist?.length || 0;
    
    return { playlistCount, seasonCount, livetvCount };
  };

  const getSubscriptionType = (type?: number) => {
    switch (type) {
      case 0: return { label: 'Gratuito', color: 'bg-green-100 text-green-800' };
      case 1: return { label: 'Premium', color: 'bg-yellow-100 text-yellow-800' };
      case 2: return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
      default: return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ContentNavigation />
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">⏳ Cargando configuración...</div>
            <p className="text-gray-400">Obteniendo estructura completa desde la API</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ContentNavigation />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
            <button
              onClick={loadCompleteData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <ContentNavigation />

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ⚙️ Configuración de Videos
              </h1>
              <p className="text-gray-600">
                Vista completa de la estructura dinámica desde la API
              </p>
            </div>
            <button
              onClick={loadCompleteData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Pruebas específicas del endpoint /login (422 encontrado!) */}
        <div className="mb-8">
          <LoginEndpointTester />
        </div>

        {/* Test Completo Mejorado */}
        <div className="mb-8">
          <ComprehensiveApiTester />
        </div>

        {/* Diagnóstico de Flujo de Autenticación */}
        <div className="mb-8">
          <AuthFlowDiagnostic />
        </div>

        {/* Descubrimiento de API */}
        <div className="mb-8">
          <ApiDiscovery />
        </div>

        {/* Pruebas avanzadas Auth0 */}
        <div className="mb-8">
          <Auth0TokenTester />
        </div>

        {/* Prueba rápida automática */}
        <div className="mb-8">
          <QuickApiTest />
        </div>

        {/* Pruebas de métodos de autenticación */}
        <div className="mb-8">
          <AuthMethodTester />
        </div>

        {/* Test de Conexión */}
        <div className="mb-8">
          <ApiConnectionTest />
        </div>

        {/* Test Exhaustivo de Endpoints */}
        <div className="mb-8">
          <ApiEndpointTester />
        </div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Segments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data?.segments?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Playlists</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data?.segments?.reduce((total, segment) => 
                    total + (segment.playlist?.length || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🎠</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Carousel</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data?.homecarousel?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">📺</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Live TV</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data?.segments?.reduce((total, segment) => 
                    total + (segment.livetvlist?.length || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Home Carousel */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              🎠 Home Carousel ({data?.homecarousel?.length || 0})
            </h2>
          </div>
          
          {data?.homecarousel && data.homecarousel.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.homecarousel.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        Carousel Item #{item.id}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    
                    {item.imgsrc && (
                      <img
                        src={item.imgsrc}
                        alt={`Carousel ${item.id}`}
                        className="w-full h-32 object-cover rounded mb-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="space-y-1 text-sm">
                      {item.link && (
                        <div>
                          <span className="font-medium">Link:</span>
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:underline truncate block"
                          >
                            {item.link}
                          </a>
                        </div>
                      )}
                      {item.video && (
                        <div>
                          <span className="font-medium">Video:</span>
                          <span className="ml-1 text-gray-600">{item.video}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Orden:</span>
                        <span className="ml-1 text-gray-600">{item.order || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>
                        <span className="ml-1 text-gray-600">{formatDate(item.date_time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              🎠 No hay elementos en el carousel
            </div>
          )}
        </div>

        {/* Segments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              🏷️ Segments ({data?.segments?.length || 0})
            </h2>
          </div>
          
          {data?.segments && data.segments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.segments.map((segment) => {
                const stats = getSegmentStats(segment);
                const isExpanded = selectedSegment === segment.id;
                
                return (
                  <div key={segment.id} className="p-6">
                    <div 
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => setSelectedSegment(isExpanded ? null : (segment.id || null))}
                    >
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {segment.name || `Segment ${segment.id}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {segment.id} • Order: {segment.order || 0}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            segment.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {segment.active ? 'Activo' : 'Inactivo'}
                          </span>
                          
                          {segment.livetv ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              📺 Live TV
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              📋 Playlists
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-500">
                          {stats.playlistCount} playlists • {stats.seasonCount} seasons • {stats.livetvCount} canales
                        </div>
                        <span className="text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 space-y-4">
                        {/* Playlists del segment */}
                        {segment.playlist && segment.playlist.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              📋 Playlists ({segment.playlist.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {segment.playlist.map((playlist) => {
                                const subType = getSubscriptionType(playlist.subscription);
                                return (
                                  <div key={playlist.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-medium text-gray-900">
                                        {playlist.title || playlist.id}
                                      </h5>
                                      <div className="flex space-x-1">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                          playlist.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {playlist.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${subType.color}`}>
                                          {subType.label}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {playlist.description && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        {playlist.description}
                                      </p>
                                    )}
                                    
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <div>ID: {playlist.id}</div>
                                      <div>Categoría: {playlist.category || 'Sin categoría'}</div>
                                      <div>Seasons: {playlist.seasons?.length || 0}</div>
                                      {playlist.subscription_cost && playlist.subscription_cost > 0 && (
                                        <div>Precio: ${playlist.subscription_cost}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Canales Live TV */}
                        {segment.livetvlist && segment.livetvlist.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              📺 Canales Live TV ({segment.livetvlist.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {segment.livetvlist.map((channel) => (
                                <div key={channel.id} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center space-x-3">
                                    {channel.logo && (
                                      <img
                                        src={channel.logo}
                                        alt={channel.name}
                                        className="w-12 h-12 object-cover rounded"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <h5 className="font-medium text-gray-900">
                                        {channel.name || `Canal ${channel.id}`}
                                      </h5>
                                      <p className="text-sm text-gray-500">
                                        Canal #{channel.number}
                                      </p>
                                      {channel.url && (
                                        <a
                                          href={channel.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          Ver stream
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              🏷️ No hay segments configurados
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideosConfig;
