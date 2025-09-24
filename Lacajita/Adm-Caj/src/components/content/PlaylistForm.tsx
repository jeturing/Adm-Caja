import React, { useState, useEffect } from 'react';
import { realApiService, ApiPlaylist, ApiSegment } from '../../services/realApiService';

interface PlaylistFormProps {
  playlist?: ApiPlaylist;
  onSave: (playlist: ApiPlaylist) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const PlaylistForm: React.FC<PlaylistFormProps> = ({
  playlist,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<Partial<ApiPlaylist>>({
    id: '',
    title: '',
    description: '',
    category: '',
    segment_id: undefined,
    subscription: 0,
    subscription_cost: 0,
    active: 1
  });
  const [segments, setSegments] = useState<ApiSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos iniciales
  useEffect(() => {
    if (playlist) {
      setFormData(playlist);
    }
  }, [playlist]);

  // Cargar segmentos disponibles
  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoadingSegments(true);
      const segmentsData = await realApiService.getSegments(1); // Solo activos
      setSegments(segmentsData);
    } catch (error) {
      console.error('Error cargando segmentos:', error);
    } finally {
      setLoadingSegments(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id?.trim()) {
      newErrors.id = 'El ID de la playlist es requerido';
    }

    if (!formData.title?.trim()) {
      newErrors.title = 'El título es requerido';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'La categoría es requerida';
    }

    if (formData.subscription_cost && formData.subscription_cost < 0) {
      newErrors.subscription_cost = 'El costo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result: ApiPlaylist;
      
      if (isEditing && playlist) {
        // Editar playlist existente
        result = await realApiService.updatePlaylist(playlist.id, formData as ApiPlaylist);
      } else {
        // Crear nueva playlist
        result = await realApiService.createPlaylist(formData as Omit<ApiPlaylist, 'id' | 'created_at' | 'updated_at'>);
      }
      
      onSave(result);
    } catch (error) {
      console.error('Error guardando playlist:', error);
      setErrors({ submit: 'Error al guardar la playlist. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ApiPlaylist, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? '✏️ Editar Playlist' : '➕ Nueva Playlist'}
        </h2>
        <p className="text-gray-600 mt-1">
          {isEditing ? 'Modifica los datos de la playlist' : 'Crea una nueva playlist para organizar tu contenido'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ID de la Playlist */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID de la Playlist *
          </label>
          <input
            type="text"
            value={formData.id || ''}
            onChange={(e) => handleInputChange('id', e.target.value)}
            disabled={isEditing} // No permitir cambiar ID en edición
            placeholder="Ej: PLT001, comedy-series, etc."
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.id ? 'border-red-500' : 'border-gray-300'
            } ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {errors.id && <p className="mt-1 text-sm text-red-600">{errors.id}</p>}
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título *
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Nombre de la playlist"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe el contenido de esta playlist..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            value={formData.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Selecciona una categoría</option>
            <option value="series">Series</option>
            <option value="documentales">Documentales</option>
            <option value="peliculas">Películas</option>
            <option value="infantil">Infantil</option>
            <option value="deportes">Deportes</option>
            <option value="noticias">Noticias</option>
            <option value="entretenimiento">Entretenimiento</option>
            <option value="educativo">Educativo</option>
            <option value="musica">Música</option>
            <option value="otros">Otros</option>
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
        </div>

        {/* Segmento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Segmento
          </label>
          {loadingSegments ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              Cargando segmentos...
            </div>
          ) : (
            <select
              value={formData.segment_id || ''}
              onChange={(e) => handleInputChange('segment_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin segmento asignado</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} {segment.livetv ? '(Live TV)' : '(On Demand)'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Configuración de Suscripción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Suscripción
            </label>
            <select
              value={formData.subscription || 0}
              onChange={(e) => handleInputChange('subscription', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Gratuito</option>
              <option value={1}>Premium</option>
              <option value={2}>VIP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.subscription_cost || 0}
              onChange={(e) => handleInputChange('subscription_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subscription_cost ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.subscription_cost && <p className="mt-1 text-sm text-red-600">{errors.subscription_cost}</p>}
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.active === 1}
              onChange={(e) => handleInputChange('active', e.target.checked ? 1 : 0)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Playlist activa</span>
          </label>
        </div>

        {/* Error de envío */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isEditing ? 'Actualizar' : 'Crear'} Playlist</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlaylistForm;
