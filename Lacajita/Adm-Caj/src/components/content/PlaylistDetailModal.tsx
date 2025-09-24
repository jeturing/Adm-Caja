import React from 'react';
import { ApiPlaylistComplete } from '../../services/realApiService';

interface PlaylistDetailModalProps {
  playlist: ApiPlaylistComplete;
  onClose: () => void;
  onEdit: (playlist: ApiPlaylistComplete) => void;
  onDelete: (playlistId: string) => void;
}

const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({
  playlist,
  onClose,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount || amount === 0) return 'Gratuito';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSubscriptionType = (type?: number) => {
    switch (type) {
      case 0: return { label: 'Gratuito', color: 'bg-green-100 text-green-800' };
      case 1: return { label: 'Premium', color: 'bg-yellow-100 text-yellow-800' };
      case 2: return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
      default: return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const subType = getSubscriptionType(playlist.subscription);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {playlist.title || playlist.id}
            </h2>
            <p className="text-sm text-gray-500">ID: {playlist.id}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(playlist)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => onDelete(playlist.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Eliminar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Información General</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Categoría:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      playlist.category ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {playlist.category || 'Sin categoría'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Estado:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      playlist.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {playlist.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Segmento:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {playlist.segment_id || 'Sin asignar'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">💳 Suscripción</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tipo:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${subType.color}`}>
                      {subType.label}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Precio:</span>
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      {formatCurrency(playlist.subscription_cost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 Fechas</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Creada:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {formatDate(playlist.created_at)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Actualizada:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {formatDate(playlist.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Estadísticas</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Seasons:</span>
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      {playlist.seasons?.length || 0}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Videos totales:</span>
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      {playlist.seasons?.reduce((total, season) => total + (season.videos?.length || 0), 0) || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descripción */}
          {playlist.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Descripción</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {playlist.description}
                </p>
              </div>
            </div>
          )}

          {/* Seasons */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📺 Seasons ({playlist.seasons?.length || 0})
            </h3>
            
            {playlist.seasons && playlist.seasons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playlist.seasons.map((season) => (
                  <div key={season.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">
                        {season.title || `Season ${season.id}`}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        season.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {season.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    
                    {season.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {season.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        ID: {season.id}
                      </span>
                      <span className="font-medium text-blue-600">
                        {season.videos?.length || 0} videos
                      </span>
                    </div>
                    
                    {season.date && (
                      <div className="mt-2 text-xs text-gray-400">
                        {formatDate(season.date)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-gray-500 mb-2">📺 No hay seasons en esta playlist</div>
                <p className="text-sm text-gray-400">
                  Las seasons se pueden agregar desde la gestión de seasons
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetailModal;
