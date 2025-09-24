import React, { useState } from 'react';
import { mockJWPlayerService } from '../../services/mockJWPlayerService';

interface PlaylistConfigProps {
  onConfigUpdate?: () => void;
}

const PlaylistConfig: React.FC<PlaylistConfigProps> = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState(mockJWPlayerService.getPlaylistConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState(config);

  const handleSave = () => {
    mockJWPlayerService.updatePlaylistIds(tempConfig);
    setConfig(tempConfig);
    setIsEditing(false);
    onConfigUpdate?.();
  };

  const handleCancel = () => {
    setTempConfig(config);
    setIsEditing(false);
  };

  const handleInputChange = (key: string, value: string) => {
    setTempConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Configuración de Playlists JWPlayer
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ✏️ Editar
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Guardar
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ❌ Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Ve a tu cuenta de JWPlayer (dashboard.jwplayer.com)</li>
            <li>2. En la sección "Content" → "Playlists"</li>
            <li>3. Copia los IDs de tus playlists (8 caracteres alfanuméricos)</li>
            <li>4. Pégalos en los campos correspondientes a continuación</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(tempConfig).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {key.charAt(0).toUpperCase() + key.slice(1).toLowerCase().replace('_', ' ')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder="Ej: AbCdEfGh"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                  {value || 'No configurado'}
                </div>
              )}
            </div>
          ))}
        </div>

        {!isEditing && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los playlist IDs mostrados son de ejemplo. 
              Necesitas configurar los IDs reales de tu cuenta de JWPlayer para ver contenido real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistConfig;
