/**
 * Página principal para visualizar videos reales de La Cajita TV
 * Integra API + JWPlayer CDN para mostrar videos funcionales
 */

import React from 'react';
import RealVideoViewer from '../../components/content/RealVideoViewer';

const VideoViewerPage: React.FC = () => {
  return (
    <div className="p-6">
      <RealVideoViewer />
    </div>
  );
};

export default VideoViewerPage;
