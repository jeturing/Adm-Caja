import React, { useState, useEffect } from 'react';
import { playlistsService, PlaylistBase } from '../../services/playlistsService';
import { segmentsService } from '../../services/entities';
import { jwPlayerCDNService } from '../../services/jwPlayerCDNService';
import { Segment } from '../../types/entities';
import PlaylistModal from '../../components/playlist/PlaylistModal';
import PlaylistDetailModal from '../../components/playlist/PlaylistDetailModal';
import { 
  ListIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashBinIcon,
  GridIcon,
  VideoIcon,
  CheckCircleIcon
} from '../../icons';

// Interfaz para playlist enriquecida
interface EnhancedPlaylist extends PlaylistBase {
  segment?: Segment;
  jwPlayerData?: {
    available: boolean;
    videoCount: number;
    title?: string;
    description?: string;
    feedId?: string;
  };
  syncStatus: 'available' | 'not_found' | 'error';
}

const RealPlaylists: React.FC = () => {
  const [playlists, setPlaylists] = useState<EnhancedPlaylist[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlaylists: 0,
    activePlaylists: 0,
    availablePlaylists: 0,
    totalVideos: 0,
    totalSegments: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Estados para el modal
  const [showModal, setShowModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<EnhancedPlaylist | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPlaylistId, setDetailPlaylistId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos base en paralelo
      const [playlistsData, segmentsData] = await Promise.all([
        playlistsService.getAll(),
        segmentsService.getAll()
      ]);
      
      setSegments(segmentsData);
      
      // Enriquecer playlists con datos de JWPlayer
      const enhancedPlaylists: EnhancedPlaylist[] = [];
      let totalVideos = 0;
      let availableCount = 0;
      
      for (const playlist of playlistsData) {
        const segment = segmentsData.find(s => s.id === playlist.segment_id);
        
        let jwPlayerData: {
          available: boolean;
          videoCount: number;
          title?: string;
          description?: string;
          feedId?: string;
        } = {
          available: false,
          videoCount: 0
        };
        let syncStatus: EnhancedPlaylist['syncStatus'] = 'not_found';
        
        try {
          // Verificar disponibilidad en JWPlayer usando el ID de la playlist
          const isAvailable = await jwPlayerCDNService.isPlaylistAvailable(playlist.id);
          
          if (isAvailable) {
            // Obtener datos de la playlist
            const playlistInfo = await jwPlayerCDNService.fetchPlaylistData(playlist.id);
            
            if (playlistInfo) {
              jwPlayerData = {
                available: true,
                videoCount: playlistInfo.playlist?.length || 0,
                title: playlistInfo.title,
                description: playlistInfo.description,
                feedId: playlistInfo.feedid
              };
              syncStatus = 'available';
              totalVideos += jwPlayerData.videoCount;
              availableCount++;
            }
          }
        } catch (error) {
          console.warn(`Error verificando playlist ${playlist.id}:`, error);
          syncStatus = 'error';
        }
        
        enhancedPlaylists.push({
          ...playlist,
          segment,
          jwPlayerData,
          syncStatus
        });
      }
      
      setPlaylists(enhancedPlaylists);
      
      // Calcular estadísticas
      const activePlaylists = enhancedPlaylists.filter(p => p.active === 1);
      
      setStats({
        totalPlaylists: enhancedPlaylists.length,
        activePlaylists: activePlaylists.length,
        availablePlaylists: availableCount,
        totalVideos,
        totalSegments: segmentsData.length
      });
      
    } catch (error) {
      console.error('Error cargando datos:', error);
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

  const handleViewJWPlayer = (playlistId: string) => {
    const jsonUrl = jwPlayerCDNService.getPlaylistJsonUrl(playlistId);
    window.open(jsonUrl, '_blank');
  };

  const handleViewRSS = (playlistId: string) => {
    const rssUrl = jwPlayerCDNService.getPlaylistRssUrl(playlistId);
    window.open(rssUrl, '_blank');
  };

  const handleCreatePlaylist = () => {
    setEditingPlaylist(null);
    setShowModal(true);
  };

  const handleEditPlaylist = (playlist: EnhancedPlaylist) => {
    setEditingPlaylist(playlist);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlaylist(null);
  };

  const handleSavePlaylist = () => {
    loadData(); // Recargar datos después de guardar
  };

  const handleViewDetails = (playlistId: string) => {
    setDetailPlaylistId(playlistId);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailPlaylistId('');
  };

  const getSyncStatusBadge = (status: EnhancedPlaylist['syncStatus']) => {
    const configs = {
      available: { color: 'bg-green-100 text-green-800', text: 'Disponible', icon: '✅' },
      not_found: { color: 'bg-red-100 text-red-800', text: 'No encontrado', icon: '❌' },
      error: { color: 'bg-yellow-100 text-yellow-800', text: 'Error', icon: '⚠️' }
    };
    
    const config = configs[status];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  // Filtros
  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playlist.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (playlist.jwPlayerData?.title && playlist.jwPlayerData.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSegment = selectedSegment === 'all' || playlist.segment_id === parseInt(selectedSegment);
    const matchesStatus = selectedStatus === 'all' || playlist.syncStatus === selectedStatus;
    
    return matchesSearch && matchesSegment && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando playlists y verificando JWPlayer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ListIcon className="w-8 h-8 mr-3 text-blue-600" />
            Playlists JWPlayer
          </h1>
          <p className="text-gray-600 mt-1">Gestiona las listas de reproducción integradas con JWPlayer</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <GridIcon className="w-4 h-4 mr-2" />
            {viewMode === 'grid' ? 'Vista Tabla' : 'Vista Grid'}
          </button>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            🔄 Actualizar
          </button>
          <button 
            onClick={handleCreatePlaylist}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nueva Playlist
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{stats.availablePlaylists}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <VideoIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalVideos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <GridIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activePlaylists}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GridIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Segmentos</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalSegments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
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
          
          <div className="flex items-center gap-4">
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
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Estados</option>
              <option value="available">Disponibles</option>
              <option value="not_found">No encontradas</option>
              <option value="error">Con errores</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredPlaylists.length} de {playlists.length} playlists
          </div>
        </div>
      </div>

      {/* Playlists Content */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((playlist) => (
            <div key={playlist.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center relative cursor-pointer"
                   onClick={() => handleViewDetails(playlist.id)}>
                <VideoIcon className="w-16 h-16 text-white opacity-80" />
                <div className="absolute top-4 right-4">
                  {getSyncStatusBadge(playlist.syncStatus)}
                </div>
                {playlist.jwPlayerData?.videoCount && (
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                    {playlist.jwPlayerData.videoCount} videos
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                  <span className="text-white opacity-0 hover:opacity-100 transition-opacity">
                    👁️ Ver detalles
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {playlist.jwPlayerData?.title || playlist.title}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    playlist.active === 1 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {playlist.active === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {playlist.jwPlayerData?.description || playlist.description || 'Sin descripción'}
                </p>
                
                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Segmento:</span>
                    <span className="font-medium">{playlist.segment?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Playlist ID:</span>
                    <span className="font-mono">{playlist.id}</span>
                  </div>
                  {playlist.jwPlayerData?.feedId && (
                    <div className="flex justify-between">
                      <span>Feed ID:</span>
                      <span className="font-mono">{playlist.jwPlayerData.feedId}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {playlist.syncStatus === 'available' ? (
                    <>
                      <button
                        onClick={() => handleViewJWPlayer(playlist.id)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                      >
                        ▶️ Ver JSON
                      </button>
                      <button
                        onClick={() => handleViewRSS(playlist.id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                      >
                        RSS
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 bg-gray-300 text-gray-500 px-3 py-2 rounded-lg text-sm text-center">
                      No disponible
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleEditPlaylist(playlist)}
                    className="text-blue-600 hover:text-blue-900 p-2">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="text-red-600 hover:text-red-900 p-2"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Playlist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segmento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado JWPlayer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Videos
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
                {filteredPlaylists.map((playlist) => (
                  <tr key={playlist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <VideoIcon className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {playlist.jwPlayerData?.title || playlist.title}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {playlist.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {playlist.segment?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSyncStatusBadge(playlist.syncStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {playlist.jwPlayerData?.videoCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        playlist.active === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {playlist.active === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {playlist.syncStatus === 'available' && (
                          <>
                            <button
                              onClick={() => handleViewJWPlayer(playlist.id)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              🔗 JSON
                            </button>
                            <button
                              onClick={() => handleViewRSS(playlist.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              RSS
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleEditPlaylist(playlist)}
                          className="text-indigo-600 hover:text-indigo-900">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPlaylists.length === 0 && (
        <div className="text-center py-12">
          <ListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay playlists</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedSegment !== 'all' || selectedStatus !== 'all'
              ? 'No se encontraron playlists con los filtros aplicados.'
              : 'Comienza agregando una nueva playlist.'
            }
          </p>
        </div>
      )}
      
      {/* Modal para crear/editar playlist */}
      <PlaylistModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSavePlaylist}
        playlist={editingPlaylist}
      />
      
      {/* Modal para ver detalles de playlist */}
      <PlaylistDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        playlistId={detailPlaylistId}
      />
    </div>
  );
};

export default RealPlaylists;
