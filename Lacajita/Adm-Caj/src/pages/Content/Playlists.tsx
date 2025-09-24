import React, { useState, useEffect } from 'react';
import { playlistsService, segmentsService } from '../../services/entities';
import { Playlist, Segment } from '../../types/entities';
import { 
  ListIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashBinIcon,
  GridIcon,
  VideoIcon
} from '../../icons';

const Playlists: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlaylists: 0,
    activePlaylists: 0,
    totalSegments: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar playlists activas
      const playlistsData = await playlistsService.getAll();
      setPlaylists(playlistsData);
      
      // Cargar segments
      const segmentsData = await segmentsService.getAll();
      setSegments(segmentsData);
      
      // Calcular estadísticas
      const activePlaylists = playlistsData.filter(p => p.active === 1);
      
      setStats({
        totalPlaylists: playlistsData.length,
        activePlaylists: activePlaylists.length,
        totalSegments: segmentsData.length
      });
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Datos de ejemplo para desarrollo
      setPlaylists([
        {
          id: 1,
          playlist_id: 'playlist1',
          segment_id: 1,
          title: 'Playlist de Entretenimiento',
          description: 'Contenido variado de entretenimiento',
          active: 1,
          thumbnail: ''
        },
        {
          id: 2,
          playlist_id: 'playlist2',
          segment_id: 2,
          title: 'Documentales',
          description: 'Documentales educativos y culturales',
          active: 1,
          thumbnail: ''
        }
      ]);
      
      setSegments([
        {
          id: 1,
          name: 'Entretenimiento',
          description: 'Contenido de entretenimiento',
          active: 1,
          order: 1
        },
        {
          id: 2,
          name: 'Educativo',
          description: 'Contenido educativo',
          active: 1,
          order: 2
        }
      ]);
      
      setStats({
        totalPlaylists: 2,
        activePlaylists: 2,
        totalSegments: 2
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta playlist?')) {
      try {
        await playlistsService.delete(playlistId);
        await loadData();
      } catch (error) {
        console.error('Error eliminando playlist:', error);
      }
    }
  };

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = selectedSegment === 'all' || playlist.segment_id === parseInt(selectedSegment);
    return matchesSearch && matchesSegment;
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
          <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
          <p className="text-gray-600 mt-1">Gestiona las listas de reproducción de La Cajita TV</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nueva Playlist
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Playlists</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPlaylists}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ListIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Playlists Activas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activePlaylists}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GridIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Segmentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSegments}</p>
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
                placeholder="Buscar playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GridIcon className="w-5 h-5 text-gray-400" />
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Segmentos</option>
              {segments.map(segment => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaylists.map((playlist) => {
          const segment = segments.find(s => s.id === playlist.segment_id);
          return (
            <div key={playlist.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <VideoIcon className="w-16 h-16 text-gray-400" />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{playlist.title}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    playlist.active === 1 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {playlist.active === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {playlist.description || 'Sin descripción'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Segmento: {segment?.name || 'N/A'}</span>
                  <span>ID: {playlist.playlist_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm">
                    Ver Detalles
                  </button>
                  <button className="text-blue-600 hover:text-blue-900">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlaylist(playlist.playlist_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlaylists.length === 0 && (
        <div className="text-center py-12">
          <ListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay playlists</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedSegment !== 'all' 
              ? 'No se encontraron playlists con los filtros aplicados.'
              : 'Comienza agregando una nueva playlist.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Playlists;
