import React, { useState, useEffect } from 'react';
import { realApiService, ApiVideo, ApiSeason } from '../../services/realApiService';

interface VideoFormProps {
  video?: ApiVideo;
  onSave: (video: ApiVideo) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const VideoForm: React.FC<VideoFormProps> = ({
  video,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ApiVideo>({
    id: video?.id || '',
    title: video?.title || '',
    description: video?.description || '',
    url: video?.url || '',
    active: video?.active ?? true,
    order: video?.order || 0,
    season_id: video?.season_id || '',
    video_type: video?.video_type || 0,
    language: video?.language || 'es',
    thumbnail: video?.thumbnail || '',
    duration: video?.duration || 0,
    quality: video?.quality || '720p',
    file_size: video?.file_size || 0,
    format: video?.format || 'mp4',
    created_at: video?.created_at || '',
    updated_at: video?.updated_at || ''
  });

  const [seasons, setSeasons] = useState<ApiSeason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const seasonsData = await realApiService.getSeasons();
      setSeasons(seasonsData);
    } catch (error) {
      console.error('Error cargando seasons:', error);
      setError('Error al cargar las seasons disponibles');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    let finalValue: any = value;
    
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = value === '' ? 0 : Number(value);
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
      if (!formData.title?.trim()) {
        throw new Error('El título es obligatorio');
      }
      if (!formData.url?.trim()) {
        throw new Error('La URL del video es obligatoria');
      }
      if (!formData.season_id?.trim()) {
        throw new Error('La season es obligatoria');
      }

      let savedVideo: ApiVideo;
      
      if (isEditing && video?.id) {
        savedVideo = await realApiService.updateVideo(video.id, formData);
        console.log('✅ Video actualizado:', savedVideo);
      } else {
        savedVideo = await realApiService.createVideo(formData);
        console.log('✅ Video creado:', savedVideo);
      }

      onSave(savedVideo);
    } catch (error: any) {
      console.error('❌ Error guardando video:', error);
      setError(error.message || 'Error al guardar el video');
    } finally {
      setLoading(false);
    }
  };

  const getVideoType = (type: number) => {
    switch (type) {
      case 0: return 'Episodio';
      case 1: return 'Trailer';
      case 2: return 'Extras';
      case 3: return 'Detrás de cámaras';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditing ? '✏️ Editar Video' : '➕ Crear Nuevo Video'}
            </h2>
            <p className="text-gray-600">
              {isEditing 
                ? `Editando: ${video?.title || video?.id}`
                : 'Complete la información del nuevo video'
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
                  ID del Video *
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  disabled={isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Ej: video-001"
                  required
                />
                {isEditing && (
                  <p className="mt-1 text-xs text-gray-500">
                    El ID no se puede modificar después de crear el video
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Season *
                </label>
                <select
                  name="season_id"
                  value={formData.season_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar season</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.title || season.id} - {season.playlist_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Título del video"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del Video *
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://ejemplo.com/video.mp4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción del video..."
              />
            </div>

            {/* Configuración técnica */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Video
                </label>
                <select
                  name="video_type"
                  value={formData.video_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Episodio</option>
                  <option value={1}>Trailer</option>
                  <option value={2}>Extras</option>
                  <option value={3}>Detrás de cámaras</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Actual: {getVideoType(formData.video_type)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="pt">Portugués</option>
                  <option value="fr">Francés</option>
                </select>
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
              </div>
            </div>

            {/* Información técnica */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (segundos)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calidad
                </label>
                <select
                  name="quality"
                  value={formData.quality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño (MB)
                </label>
                <input
                  type="number"
                  name="file_size"
                  value={formData.file_size}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                  <option value="mov">MOV</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del Thumbnail
              </label>
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://ejemplo.com/thumbnail.jpg"
              />
            </div>

            {/* Estado */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Video activo
              </label>
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
                {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Video')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoForm;
