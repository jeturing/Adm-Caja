import React, { useState, useEffect } from 'react';
import { videosService, seasonsService } from '../../services/entities';
import { Video, Season } from '../../types/entities';
import { 
  VideoIcon, 
  EyeIcon, 
  CalenderIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashBinIcon,
  GridIcon
} from '../../icons';

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    activeVideos: 0,
    totalViews: 0,
    totalDuration: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar videos activos
      const videosData = await videosService.getAll();
      setVideos(videosData);
      
      // Cargar seasons
      const seasonsData = await seasonsService.getAll();
      setSeasons(seasonsData);
      
      // Calcular estadísticas
      const activeVideos = videosData.filter(v => v.active === 1);
      const totalViews = videosData.reduce((sum, v) => sum + (v.view_count || 0), 0);
      
      setStats({
        totalVideos: videosData.length,
        activeVideos: activeVideos.length,
        totalViews,
        totalDuration: videosData.length * 15 // Estimación
      });
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Datos de ejemplo para desarrollo
      setVideos([
        {
          video_id: 'test1',
          season_id: 1,
          title: 'Video de prueba 1',
          description: 'Descripción del video de prueba',
          thumbnail: '',
          duration: '15:30',
          view_count: 1250,
          active: 1,
          published_at: '2024-01-15'
        },
        {
          video_id: 'test2',
          season_id: 1,
          title: 'Video de prueba 2',
          description: 'Otra descripción',
          thumbnail: '',
          duration: '18:45',
          view_count: 980,
          active: 1,
          published_at: '2024-01-22'
        }
      ]);
      
      setSeasons([
        {
          id: 1,
          season_id: 'season1',
          title: 'Temporada 1',
          description: 'Primera temporada',
          season_number: 1,
          active: 1
        }
      ]);
      
      setStats({
        totalVideos: 2,
        activeVideos: 2,
        totalViews: 2230,
        totalDuration: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (seasonId: number, videoId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
      try {
        await videosService.delete(seasonId, videoId);
        await loadData();
      } catch (error) {
        console.error('Error eliminando video:', error);
      }
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeason = selectedSeason === 'all' || video.season_id === parseInt(selectedSeason);
    return matchesSearch && matchesSeason;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-600 mt-1">Gestiona el contenido de video de La Cajita TV</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nuevo Video
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <VideoIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <VideoIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Videos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeVideos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EyeIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Visualizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CalenderIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Temporadas</p>
              <p className="text-2xl font-bold text-gray-900">{seasons.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <GridIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GridIcon className="w-5 h-5 text-gray-400" />
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las Temporadas</option>
              {seasons.map(season => (
                <option key={season.id} value={season.id}>{season.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Videos List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temporada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualizaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVideos.map((video) => {
                const season = seasons.find(s => s.id === video.season_id);
                return (
                  <tr key={`${video.season_id}-${video.video_id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-24">
                          <div className="h-16 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
                            <VideoIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {video.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {video.description && video.description.substring(0, 50) + '...'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{season?.title || 'N/A'}</div>
                      <div className="text-sm text-gray-500">Temporada {season?.season_number || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{video.duration || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(video.view_count || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        video.active === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {video.active === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteVideo(video.season_id, video.video_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay videos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedSeason !== 'all' 
                ? 'No se encontraron videos con los filtros aplicados.'
                : 'Comienza agregando un nuevo video.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Videos;
