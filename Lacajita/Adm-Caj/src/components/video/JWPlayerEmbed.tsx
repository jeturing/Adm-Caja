import React, { useEffect, useRef } from 'react';
import { jwPlayerCDNService } from '../../services/jwPlayerCDNService';
import apiClient from '../../services/apiClient';

interface JWPlayerEmbedProps {
  mediaId: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

const JWPlayerEmbed: React.FC<JWPlayerEmbedProps> = ({
  mediaId,
  width = '100%',
  height = 280,
  className = '',
  autoplay = false,
  muted = true
}) => {
  if (!mediaId) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
           style={{ width, height }}>
        <p className="text-gray-600 text-sm">Media ID no proporcionado</p>
      </div>
    );
  }

  // Usar el servicio CDN para obtener la URL de embed
  const embedUrl = jwPlayerCDNService.getVideoEmbedUrl(mediaId);
  const params = new URLSearchParams();
  
  if (autoplay) params.set('autoplay', 'true');
  if (muted) params.set('muted', 'true');
  params.set('responsive', 'true');
  
  const fullUrl = params.toString() ? `${embedUrl}?${params.toString()}` : embedUrl;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Enviar un evento simple de impresión al montar
  useEffect(() => {
    (async () => {
      try {
        await apiClient.post('/analytics/video-event', { media_id: mediaId, event: 'impression' });
      } catch (e) {
        // no bloquear UI por tracking
      }
    })();
  }, [mediaId]);

  // Listener para postMessage desde JWPlayer embed (si está habilitado)
  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      try {
        // Algunos embeds envían mensajes con { event, position, duration }
        const data = typeof ev.data === 'string' ? (() => { try { return JSON.parse(ev.data); } catch { return null; } })() : ev.data;
        if (!data || !data.event) return;
        const evt = data.event.toString();
        if (['play','pause','complete','time'].includes(evt)) {
          await apiClient.post('/analytics/video-event', {
            media_id: mediaId,
            event: evt,
            position: data.position,
            duration: data.duration,
          });
        }
      } catch {
        // ignorar
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mediaId]);

  return (
    <div className={`jwplayer-container ${className}`} style={{ width, height }}>
      <iframe
        src={fullUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        allow="autoplay; fullscreen"
        className="rounded-lg"
        title={`JWPlayer Video ${mediaId}`}
        ref={iframeRef}
      />
    </div>
  );
};

export default JWPlayerEmbed;
