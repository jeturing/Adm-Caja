import React from 'react';
import { EnhancedVideo } from '../../services/realHybridVideoService';
import JWPlayerEmbed from './JWPlayerEmbed';
import { CloseIcon, VideoIcon, EyeIcon, CalenderIcon } from '../../icons';

interface VideoModalProps {
  video: EnhancedVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, isOpen, onClose }) => {
  if (!isOpen || !video) return null;

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getSyncStatusColor = (status: EnhancedVideo['syncStatus']): string => {
    switch (status) {
      case 'synced': return 'text-green-600 bg-green-100';
      case 'missing_jwplayer': return 'text-yellow-600 bg-yellow-100';
      case 'api_only': return 'text-blue-600 bg-blue-100';
      case 'jwplayer_only': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSyncStatusText = (status: EnhancedVideo['syncStatus']): string => {
    switch (status) {
      case 'synced': return 'Sincronizado';
      case 'missing_jwplayer': return 'Falta en JWPlayer';
      case 'api_only': return 'Solo en API';
      case 'jwplayer_only': return 'Solo en JWPlayer';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <VideoIcon className="w-6 h-6 mr-2 text-blue-600" />
            {video.jwPlayer?.title || video.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Video Player */}
        <div className="p-6">
          {video.jwPlayer?.available && video.jwPlayer.mediaId ? (
            <JWPlayerEmbed
              mediaId={video.jwPlayer.mediaId}
              height={400}
              className="w-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <VideoIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Video no disponible en JWPlayer</p>
                <p className="text-sm text-gray-500 mt-1">
                  {video.jwPlayer?.playlistId ? 
                    `Playlist ID: ${video.jwPlayer.playlistId}` : 
                    'Sin playlist asociada'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Video Information */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Información del Video</h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">ID:</span>
                  <span className="font-medium">{video.video_id}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">Duración:</span>
                  <span className="font-medium">
                    {video.jwPlayer?.duration ? 
                      formatDuration(video.jwPlayer.duration) : 
                      video.duration || 'N/A'
                    }
                  </span>
                </div>
                
                <div className="flex items-center">
                  <EyeIcon className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600 w-16">Vistas:</span>
                  <span className="font-medium">{video.view_count || 0}</span>
                </div>
                
                <div className="flex items-center">
                  <CalenderIcon className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600 w-16">Publicado:</span>
                  <span className="font-medium">{formatDate(video.published_at)}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    video.active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                  }`}>
                    {video.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {(video.jwPlayer?.description || video.description) && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Descripción</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {video.jwPlayer?.description || video.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - JWPlayer & Sync Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Estado de Sincronización</h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-600 w-24">Estado:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSyncStatusColor(video.syncStatus)}`}>
                    {getSyncStatusText(video.syncStatus)}
                  </span>
                </div>

                {video.jwPlayer?.playlistId && (
                  <div className="flex items-center">
                    <span className="text-gray-600 w-24">Playlist:</span>
                    <span className="font-medium text-sm">{video.jwPlayer.playlistId}</span>
                  </div>
                )}

                {video.jwPlayer?.mediaId && (
                  <div className="flex items-center">
                    <span className="text-gray-600 w-24">Media ID:</span>
                    <span className="font-medium text-sm">{video.jwPlayer.mediaId}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <span className="text-gray-600 w-24">JWPlayer:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    video.jwPlayer?.available ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                  }`}>
                    {video.jwPlayer?.available ? 'Disponible' : 'No disponible'}
                  </span>
                </div>
              </div>

              {/* Technical Info */}
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Información Técnica</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Season ID:</span>
                    <span className="font-medium">{video.season_id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creado:</span>
                    <span className="font-medium">{formatDate(video.created_at)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actualizado:</span>
                    <span className="font-medium">{formatDate(video.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {video.tags && video.tags.trim() && (
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {video.tags.split(',').map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            {video.jwPlayer?.embedUrl && (
              <button
                onClick={() => video.jwPlayer?.embedUrl && window.open(video.jwPlayer.embedUrl, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <VideoIcon className="w-4 h-4 mr-2" />
                Ver en JWPlayer
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
