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

  const formatDuration = (seconds?: number | string): string => {
    if (!seconds) return 'N/A';
    if (typeof seconds === 'string') return seconds;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Determinar si hay datos de JWPlayer disponibles
  const hasJWPlayer = video.jwPlayer && video.jwPlayer.available;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{video.jwPlayer?.title || video.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {hasJWPlayer && video.jwPlayer?.embedUrl ? (
              <JWPlayerEmbed
                mediaId={video.jwPlayer.mediaId || video.video_id}
                width="100%"
                height="100%"
                autoplay={false}
                muted={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <VideoIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Video no disponible en JWPlayer</p>
                  <p className="text-sm text-gray-500 mt-1">ID: {video.video_id}</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Información Básica</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">ID: {video.video_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalenderIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Duración: {formatDuration(video.jwPlayer?.duration || video.duration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EyeIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Visualizaciones: {(video.view_count || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      video.active === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {video.active === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Descripción</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{video.description}</p>
                </div>
              )}
            </div>

            {/* Right Column - Technical Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Información Técnica</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado de Sincronización:</span>
                    <span className="font-medium">{video.syncStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temporada ID:</span>
                    <span className="font-medium">{video.season_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Publicado:</span>
                    <span className="font-medium">{formatDate(video.published_at)}</span>
                  </div>
                  {video.jwPlayer?.playlistId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Playlist JWPlayer:</span>
                      <span className="font-medium">{video.jwPlayer.playlistId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* JWPlayer Thumbnail */}
              {video.jwPlayer?.thumbnail && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Thumbnail JWPlayer</h4>
                  <img
                    src={video.jwPlayer.thumbnail}
                    alt="Thumbnail"
                    className="w-full max-w-xs rounded shadow"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Editar Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
