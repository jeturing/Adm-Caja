import React, { useState, useEffect } from 'react';
import { realApiService, ApiSegment } from '../../services/realApiService';
import SegmentForm from '../../components/content/SegmentForm';
import ContentNavigation from '../../components/content/ContentNavigation';

const SegmentManager: React.FC = () => {
  const [segments, setSegments] = useState<ApiSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<ApiSegment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      setError('');
      const segmentsData = await realApiService.getSegments();
      setSegments(segmentsData);
      console.log('✅ Segments cargados:', segmentsData.length);
    } catch (error: any) {
      console.error('❌ Error cargando segments:', error);
      setError('Error al cargar los segments. Verifique la conexión con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = () => {
    setEditingSegment(null);
    setShowForm(true);
  };

  const handleEditSegment = (segment: ApiSegment) => {
    setEditingSegment(segment);
    setShowForm(true);
  };

  const handleDeleteSegment = async (segmentId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este segment?')) {
      return;
    }

    try {
      await realApiService.deleteSegment(segmentId);
      await loadSegments(); // Recargar la lista
      console.log('✅ Segment eliminado:', segmentId);
    } catch (error) {
      console.error('❌ Error eliminando segment:', error);
      setError('Error al eliminar el segment.');
    }
  };

  const handleSaveSegment = async (segment: ApiSegment) => {
    setShowForm(false);
    setEditingSegment(null);
    await loadSegments(); // Recargar la lista
    console.log('✅ Segment guardado:', segment.id);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSegment(null);
  };

  const getSegmentType = (livetv?: number) => {
    return livetv ? 'Live TV' : 'Playlists';
  };

  const getSegmentTypeColor = (livetv?: number) => {
    return livetv 
      ? 'bg-red-100 text-red-800' 
      : 'bg-blue-100 text-blue-800';
  };

  // Filtrar segments
  const filteredSegments = segments.filter(segment => {
    const matchesSearch = segment.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         segment.id?.toString().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || 
                       (selectedType === 'playlists' && !segment.livetv) ||
                       (selectedType === 'livetv' && segment.livetv);
    
    return matchesSearch && matchesType;
  });

  // Obtener estadísticas
  const stats = {
    total: segments.length,
    active: segments.filter(s => s.active === 1).length,
    inactive: segments.filter(s => s.active === 0).length,
    playlists: segments.filter(s => !s.livetv).length,
    livetv: segments.filter(s => s.livetv).length
  };

  if (showForm) {
    return (
      <SegmentForm
        segment={editingSegment || undefined}
        onSave={handleSaveSegment}
        onCancel={handleCancelForm}
        isEditing={!!editingSegment}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navegación de contenido */}
        <ContentNavigation />

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🏷️ Gestión de Segments
              </h1>
              <p className="text-gray-600">
                Administra las categorías principales de contenido de La Cajita TV
              </p>
            </div>
            <button
              onClick={handleCreateSegment}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nuevo Segment</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Segments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-semibold text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Playlists</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.playlists}</p>
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
                <p className="text-2xl font-semibold text-red-600">{stats.livetv}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar segments
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Tipo
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="playlists">📋 Playlists</option>
                <option value="livetv">📺 Live TV</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de segments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">⏳ Cargando segments...</div>
            </div>
          ) : filteredSegments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSegments
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((segment) => (
                    <tr key={segment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {segment.name || `Segment ${segment.id}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {segment.id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSegmentTypeColor(segment.livetv)}`}>
                          {segment.livetv ? '📺' : '📋'} {getSegmentType(segment.livetv)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {segment.order || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          segment.active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {segment.active === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditSegment(segment)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSegment(segment.id!)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">🏷️ No hay segments disponibles</div>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedType
                  ? 'No se encontraron segments que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primer segment.'}
              </p>
              {!searchTerm && !selectedType && (
                <button
                  onClick={handleCreateSegment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Crear primer segment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Mostrando {filteredSegments.length} de {segments.length} segments
        </div>
      </div>
    </div>
  );
};

export default SegmentManager;
