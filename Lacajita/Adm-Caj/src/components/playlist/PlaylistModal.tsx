import React, { useState, useEffect } from 'react';
import { playlistsService, PlaylistCreateData, PlaylistUpdateData } from '../../services/playlistsService';
import { segmentsService } from '../../services/entities';
import { Segment } from '../../types/entities';
import { CheckCircleIcon, AlertIcon } from '../../icons';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  playlist?: any; // Playlist existente para editar, null para crear
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onSave,
  playlist
}) => {
  const [formData, setFormData] = useState<Partial<PlaylistCreateData>>({
    title: '',
    description: '',
    category: '',
    segment_id: 0,
    subscription: 0,
    subscription_cost: 0,
    active: 1
  });
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Cargar segmentos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadSegments();
      
      // Si hay playlist, cargar sus datos
      if (playlist) {
        setFormData({
          title: playlist.title,
          description: playlist.description,
          category: playlist.category,
          segment_id: playlist.segment_id,
          subscription: playlist.subscription,
          subscription_cost: playlist.subscription_cost,
          active: playlist.active
        });
      } else {
        // Reset para nueva playlist
        setFormData({
          title: '',
          description: '',
          category: '',
          segment_id: 0,
          subscription: 0,
          subscription_cost: 0,
          active: 1
        });
      }
      
      setErrors([]);
      setSuccess(false);
    }
  }, [isOpen, playlist]);

  const loadSegments = async () => {
    try {
      const segmentsData = await segmentsService.getAll();
      setSegments(segmentsData);
    } catch (error) {
      console.error('Error cargando segmentos:', error);
    }
  };

  const handleInputChange = (field: keyof PlaylistCreateData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar errores al hacer cambios
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos
    const validationErrors = playlistsService.validatePlaylistData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors([]);
    
    try {
      if (playlist) {
        // Editar playlist existente
        await playlistsService.update(playlist.id, formData as PlaylistUpdateData);
      } else {
        // Crear nueva playlist
        if (!formData.id) {
          // Generar ID único si no se proporciona
          formData.id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        await playlistsService.create(formData as PlaylistCreateData);
      }
      
      setSuccess(true);
      
      // Cerrar modal después de un momento
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error guardando playlist:', error);
      setErrors([error.message || 'Error al guardar la playlist']);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {playlist ? 'Editar Playlist' : 'Nueva Playlist'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Mensajes de estado */}
          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Playlist {playlist ? 'actualizada' : 'creada'} exitosamente
            </div>
          )}

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Errores de validación:</span>
              </div>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ID de playlist (solo para nueva) */}
            {!playlist && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Playlist
                </label>
                <input
                  type="text"
                  value={formData.id || ''}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                  placeholder="playlist_ejemplo_123 (se generará automáticamente si se deja vacío)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este ID se usará para buscar la playlist en JWPlayer CDN
                </p>
              </div>
            )}

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segmento *
              </label>
              <select
                value={formData.segment_id}
                onChange={(e) => handleInputChange('segment_id', parseInt(e.target.value))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Seleccionar segmento</option>
                {segments.map(segment => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Suscripción */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requiere Suscripción
                </label>
                <select
                  value={formData.subscription}
                  onChange={(e) => handleInputChange('subscription', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>No</option>
                  <option value={1}>Sí</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo de Suscripción
                </label>
                <input
                  type="number"
                  value={formData.subscription_cost}
                  onChange={(e) => handleInputChange('subscription_cost', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Estado activo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.active}
                onChange={(e) => handleInputChange('active', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  playlist ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;
