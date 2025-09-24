import React, { useState, useEffect } from 'react';
import { realApiService, ApiHomeCarousel } from '../../services/realApiService';

interface HomeCarouselFormProps {
  item?: ApiHomeCarousel;
  onSave: (item: ApiHomeCarousel) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const HomeCarouselForm: React.FC<HomeCarouselFormProps> = ({
  item,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ApiHomeCarousel>({
    id: 0,
    link: '',
    imgsrc: '',
    video: '',
    date_time: '',
    active: 1,
    order: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        date_time: item.date_time ? formatDateForInput(item.date_time) : ''
      });
      if (item.imgsrc) {
        setImagePreview(item.imgsrc);
      }
    } else {
      // Para nuevos items, establecer fecha actual
      const now = new Date();
      setFormData(prev => ({
        ...prev,
        date_time: now.toISOString().slice(0, 16) // formato para datetime-local
      }));
    }
  }, [item]);

  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Preview de imagen
    if (name === 'imgsrc' && value) {
      setImagePreview(value);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.imgsrc?.trim()) {
      errors.push('La imagen es requerida');
    }

    if (formData.link && formData.video) {
      errors.push('No puede tener tanto link como video. Elija solo uno.');
    }

    if (!formData.link?.trim() && !formData.video?.trim()) {
      errors.push('Debe especificar al menos un link o un video');
    }

    if (formData.order === undefined || formData.order < 0) {
      errors.push('El orden debe ser un número válido mayor o igual a 0');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Preparar datos para envío
      const submitData: ApiHomeCarousel = {
        ...formData,
        date_time: formData.date_time ? new Date(formData.date_time).toISOString() : undefined
      };

      let result: ApiHomeCarousel;
      if (isEditing && formData.id) {
        console.log('📝 Actualizando item del carousel:', formData.id);
        result = await realApiService.updateHomeCarousel(formData.id, submitData);
      } else {
        console.log('➕ Creando nuevo item del carousel');
        const { id, ...dataWithoutId } = submitData;
        result = await realApiService.createHomeCarousel(dataWithoutId);
      }

      console.log('✅ Item del carousel guardado exitosamente:', result);
      onSave(result);
    } catch (error: any) {
      console.error('❌ Error guardando item del carousel:', error);
      setError(error.message || 'Error al guardar el item del carousel');
    } finally {
      setLoading(false);
    }
  };

  const getActionType = () => {
    if (formData.video?.trim()) return 'video';
    if (formData.link?.trim()) return 'link';
    return 'none';
  };

  const setActionType = (type: string) => {
    if (type === 'video') {
      setFormData(prev => ({ ...prev, link: '' }));
    } else if (type === 'link') {
      setFormData(prev => ({ ...prev, video: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? '✏️ Editar Item del Carousel' : '➕ Nuevo Item del Carousel'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ❌
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Imagen */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🖼️ URL de la Imagen *
                </label>
                <input
                  type="url"
                  name="imgsrc"
                  value={formData.imgsrc || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  required
                />
                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs h-32 object-cover rounded-md border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tipo de Acción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 Tipo de Acción
                </label>
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="actionType"
                      value="link"
                      checked={getActionType() === 'link'}
                      onChange={(e) => setActionType(e.target.value)}
                      className="mr-2"
                    />
                    🔗 Link Externo
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="actionType"
                      value="video"
                      checked={getActionType() === 'video'}
                      onChange={(e) => setActionType(e.target.value)}
                      className="mr-2"
                    />
                    🎬 Video ID
                  </label>
                </div>
              </div>

              {/* Link */}
              {getActionType() === 'link' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔗 Link de Destino
                  </label>
                  <input
                    type="url"
                    name="link"
                    value={formData.link || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://ejemplo.com/destino"
                  />
                </div>
              )}

              {/* Video ID */}
              {getActionType() === 'video' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎬 ID del Video
                  </label>
                  <input
                    type="text"
                    name="video"
                    value={formData.video || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ID del video en el sistema"
                  />
                </div>
              )}

              {/* Fecha y Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  name="date_time"
                  value={formData.date_time || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Orden */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔢 Orden de Visualización
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order || 0}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Orden de aparición en el carousel (menor número = más arriba)
                </p>
              </div>

              {/* Estado */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Estado
                </label>
                <select
                  name="active"
                  value={formData.active}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>✅ Activo</option>
                  <option value={0}>❌ Inactivo</option>
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '⏳ Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomeCarouselForm;
