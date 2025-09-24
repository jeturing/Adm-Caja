import React, { useState, useEffect } from 'react';
import { realApiService, ApiSeason, ApiPlaylist } from '../../services/realApiService';

interface SeasonFormProps {
  season?: ApiSeason;
  onSave: (season: ApiSeason) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const SeasonForm: React.FC<SeasonFormProps> = ({
  season,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ApiSeason>({
    id: season?.id || undefined,
    playlist_id: season?.playlist_id || '',
    title: season?.title || '',
    description: season?.description || '',
    date: season?.date || '',
    active: season?.active ?? 1
  });

  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const playlistsData = await realApiService.getPlaylists();
      setPlaylists(playlistsData);
    } catch (error) {
      console.error('Error cargando playlists:', error);
      setError('Error al cargar las playlists disponibles');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    let finalValue: any = value;
    
    if (type === 'number') {
      finalValue = value === '' ? undefined : Number(value);
    } else if (name === 'active') {
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
      if (!formData.playlist_id?.trim()) {
        throw new Error('La playlist es obligatoria');
      }

      let savedSeason: ApiSeason;
      
      if (isEditing && season?.id) {
        savedSeason = await realApiService.updateSeason(season.id, formData);
        console.log('✅ Season actualizada:', savedSeason);
      } else {
        savedSeason = await realApiService.createSeason(formData);
        console.log('✅ Season creada:', savedSeason);
      }

      onSave(savedSeason);
    } catch (error: any) {
      console.error('❌ Error guardando season:', error);
      setError(error.message || 'Error al guardar la season');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditing ? '✏️ Editar Season' : '➕ Crear Nueva Season'}
            </h2>
            <p className="text-gray-600">
              {isEditing 
                ? `Editando: ${season?.title || `Season ${season?.id}`}`
                : 'Complete la información de la nueva season'
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
                  Playlist *
                </label>
                <select
                  name="playlist_id"
                  value={formData.playlist_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleccionar playlist</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.title || playlist.id}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value={1}>Activa</option>
                  <option value={0}>Inactiva</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Season
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Temporada 1, Season 2023, etc."
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
                placeholder="Descripción de la season..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Fecha de lanzamiento o relevancia de la season
              </p>
            </div>

            {/* Vista previa de la información */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                📋 Vista Previa
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Playlist:</span>
                  <span className="ml-2 text-gray-600">
                    {formData.playlist_id ? 
                      playlists.find(p => p.id === formData.playlist_id)?.title || formData.playlist_id 
                      : 'No seleccionada'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Título:</span>
                  <span className="ml-2 text-gray-600">
                    {formData.title || 'Sin título'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    formData.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {formData.date && (
                  <div>
                    <span className="font-medium text-gray-700">Fecha:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(formData.date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {formData.description && (
                  <div>
                    <span className="font-medium text-gray-700">Descripción:</span>
                    <p className="ml-2 text-gray-600 mt-1">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                💡 Información sobre Seasons
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Las seasons agrupan videos dentro de una playlist</li>
                <li>• Cada season puede tener múltiples videos asociados</li>
                <li>• El título y descripción ayudan a organizar el contenido</li>
                <li>• Las seasons inactivas no se muestran en la aplicación</li>
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
                {loading ? 'Guardando...' : (isEditing ? 'Actualizar Season' : 'Crear Season')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SeasonForm;
