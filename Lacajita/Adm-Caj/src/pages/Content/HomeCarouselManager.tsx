import React, { useState, useEffect } from 'react';
import { realApiService, ApiHomeCarousel } from '../../services/realApiService';
import HomeCarouselForm from '../../components/content/HomeCarouselForm';
import CarouselPreview from '../../components/content/CarouselPreview';
import ContentNavigation from '../../components/content/ContentNavigation';

const HomeCarouselManager: React.FC = () => {
  const [items, setItems] = useState<ApiHomeCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiHomeCarousel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCarouselItems();
  }, []);

  const loadCarouselItems = async () => {
    try {
      setLoading(true);
      setError('');
      const itemsData = await realApiService.getHomeCarousel();
      setItems(itemsData);
      console.log('✅ Items del carousel cargados:', itemsData.length);
    } catch (error: any) {
      console.error('❌ Error cargando items del carousel:', error);
      setError('Error al cargar los items del carousel. Verifique la conexión con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: ApiHomeCarousel) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este item del carousel?')) {
      return;
    }

    try {
      await realApiService.deleteHomeCarousel(itemId);
      await loadCarouselItems(); // Recargar la lista
      console.log('✅ Item del carousel eliminado:', itemId);
    } catch (error) {
      console.error('❌ Error eliminando item del carousel:', error);
      setError('Error al eliminar el item del carousel.');
    }
  };

  const handleToggleStatus = async (item: ApiHomeCarousel) => {
    if (!item.id) return;

    try {
      const updatedItem = {
        ...item,
        active: item.active === 1 ? 0 : 1
      };
      
      await realApiService.updateHomeCarousel(item.id, updatedItem);
      await loadCarouselItems(); // Recargar la lista
      console.log('✅ Estado del item actualizado:', item.id);
    } catch (error) {
      console.error('❌ Error actualizando estado del item:', error);
      setError('Error al actualizar el estado del item.');
    }
  };

  const handleSaveItem = async (item: ApiHomeCarousel) => {
    setShowForm(false);
    setEditingItem(null);
    await loadCarouselItems(); // Recargar la lista
    console.log('✅ Item del carousel guardado:', item.id);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleImageError = (itemId: number) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const getActionType = (item: ApiHomeCarousel): string => {
    if (item.video?.trim()) return 'video';
    if (item.link?.trim()) return 'link';
    return 'none';
  };

  const getActionDisplay = (item: ApiHomeCarousel): string => {
    const type = getActionType(item);
    switch (type) {
      case 'video':
        return `🎬 Video: ${item.video}`;
      case 'link':
        return `🔗 Link: ${item.link?.substring(0, 50)}${item.link && item.link.length > 50 ? '...' : ''}`;
      default:
        return '❌ Sin acción';
    }
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  // Filtrar items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
                         item.id?.toString().includes(searchTerm.toLowerCase()) ||
                         item.link?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.video?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === '' || 
                         (selectedStatus === 'active' && item.active === 1) ||
                         (selectedStatus === 'inactive' && item.active === 0);
    
    return matchesSearch && matchesStatus;
  });

  // Obtener estadísticas
  const stats = {
    total: items.length,
    active: items.filter(item => item.active === 1).length,
    inactive: items.filter(item => item.active === 0).length,
    withVideo: items.filter(item => item.video?.trim()).length,
    withLink: items.filter(item => item.link?.trim()).length
  };

  if (showForm) {
    return (
      <HomeCarouselForm
        item={editingItem || undefined}
        onSave={handleSaveItem}
        onCancel={handleCancelForm}
        isEditing={!!editingItem}
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
                🎠 Gestión de Home Carousel
              </h1>
              <p className="text-gray-600">
                Administra las imágenes y enlaces del carousel principal de La Cajita TV
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
                  showPreview 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <span>{showPreview ? '👁️' : '👀'}</span>
                <span>{showPreview ? 'Ocultar Preview' : 'Ver Preview'}</span>
              </button>
              <button
                onClick={handleCreateItem}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Nuevo Item</span>
              </button>
            </div>
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

        {/* Preview del Carousel */}
        {showPreview && (
          <div className="mb-8">
            <CarouselPreview />
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-2xl">🎠</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
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
                <span className="text-2xl">🎬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Con Video</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.withVideo}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🔗</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Con Link</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.withLink}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar items
              </label>
              <input
                type="text"
                placeholder="Buscar por ID, link o video..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="active">✅ Solo Activos</option>
                <option value="inactive">❌ Solo Inactivos</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de items */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">⏳ Cargando items del carousel...</div>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredItems
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 border">
                  {/* Imagen */}
                  <div className="mb-4">
                    {item.imgsrc && !imageErrors[item.id!] ? (
                      <img
                        src={item.imgsrc}
                        alt={`Carousel item ${item.id}`}
                        className="w-full h-48 object-cover rounded-md"
                        onError={() => handleImageError(item.id!)}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">🖼️</span>
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">
                        Item #{item.id}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.active === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Orden: {item.order || 0}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      {getActionDisplay(item)}
                    </div>

                    <div className="text-xs text-gray-500">
                      📅 {formatDateTime(item.date_time)}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`px-3 py-1 text-xs rounded ${
                        item.active === 1
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {item.active === 1 ? '❌ Desactivar' : '✅ Activar'}
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id!)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">🎠 No hay items en el carousel</div>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedStatus
                  ? 'No se encontraron items que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primer item del carousel.'}
              </p>
              {!searchTerm && !selectedStatus && (
                <button
                  onClick={handleCreateItem}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Crear primer item
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Mostrando {filteredItems.length} de {items.length} items del carousel
        </div>
      </div>
    </div>
  );
};

export default HomeCarouselManager;
