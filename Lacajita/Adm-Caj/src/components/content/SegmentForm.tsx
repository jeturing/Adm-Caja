import React, { useState } from 'react';
import { realApiService, ApiSegment } from '../../services/realApiService';

interface SegmentFormProps {
  segment?: ApiSegment;
  onSave: (segment: ApiSegment) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const SegmentForm: React.FC<SegmentFormProps> = ({
  segment,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ApiSegment>({
    id: segment?.id || undefined,
    name: segment?.name || '',
    livetv: segment?.livetv ?? 0,
    order: segment?.order ?? 0,
    active: segment?.active ?? 1
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    let finalValue: any = value;
    
    if (type === 'number') {
      finalValue = value === '' ? 0 : Number(value);
    } else if (name === 'active' || name === 'livetv') {
      finalValue = Number(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones básicas
      if (!formData.name?.trim()) {
        throw new Error('El nombre del segment es obligatorio');
      }

      let savedSegment: ApiSegment;
      
      if (isEditing && segment?.id) {
        savedSegment = await realApiService.updateSegment(segment.id, formData);
        console.log('✅ Segment actualizado:', savedSegment);
      } else {
        savedSegment = await realApiService.createSegment(formData);
        console.log('✅ Segment creado:', savedSegment);
      }

      onSave(savedSegment);
    } catch (error: any) {
      console.error('❌ Error guardando segment:', error);
      setError(error.message || 'Error al guardar el segment');
    } finally {
      setLoading(false);
    }
  };

  const getSegmentType = () => {
    return formData.livetv ? 'Live TV' : 'Playlists';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditing ? '✏️ Editar Segment' : '➕ Crear Nuevo Segment'}
            </h2>
            <p className="text-gray-600">
              {isEditing 
                ? `Editando: ${segment?.name || `Segment ${segment?.id}`}`
                : 'Complete la información del nuevo segment'
              }
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Segment *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Películas, Series, Deportes, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Orden de aparición en la aplicación
                </p>
              </div>
            </div>

            {/* Tipo de segment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Segment
              </label>
              <select
                name="livetv"
                value={formData.livetv}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>📋 Playlists (Contenido on-demand)</option>
                <option value={1}>📺 Live TV (Canales en vivo)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Seleccione si este segment contendrá playlists de contenido o canales de TV en vivo
              </p>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                name="active"
                value={formData.active}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>

            {/* Vista previa de la información */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                📋 Vista Previa
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nombre:</span>
                  <span className="ml-2 text-gray-600">
                    {formData.name || 'Sin nombre'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tipo:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    formData.livetv ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {getSegmentType()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Orden:</span>
                  <span className="ml-2 text-gray-600">
                    {formData.order}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    formData.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                💡 Información sobre Segments
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Los segments organizan el contenido en categorías principales</li>
                <li>• Cada segment puede contener playlists (on-demand) o canales (Live TV)</li>
                <li>• El orden determina la posición en la aplicación</li>
                <li>• Los segments inactivos no se muestran a los usuarios</li>
                {formData.livetv ? (
                  <li>• <strong>Live TV:</strong> Este segment contendrá canales de televisión en vivo</li>
                ) : (
                  <li>• <strong>Playlists:</strong> Este segment contendrá playlists de contenido on-demand</li>
                )}
              </ul>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : (isEditing ? 'Actualizar Segment' : 'Crear Segment')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SegmentForm;
