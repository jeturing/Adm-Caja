/**
 * Servicio para integración con JWPlayer CDN
 * Usa los playlist IDs de la API para construir URLs de JWPlayer
 */

// Interfaces para JWPlayer CDN responses
export interface JWPlayerVideo {
  title: string;
  description?: string;
  mediaid: string;
  link?: string;
  pubdate?: number;
  duration?: number;
  image?: string;
  sources?: Array<{
    file: string;
    type: string;
    width?: number;
    height?: number;
  }>;
}

export interface JWPlayerPlaylistResponse {
  title: string;
  description?: string;
  kind: string;
  feedid: string;
  playlist: JWPlayerVideo[];
}

export class JWPlayerCDNService {
  private readonly cdnBaseUrl: string;

  constructor() {
    this.cdnBaseUrl = import.meta.env.VITE_JWPLAYER_CDN_URL || 'https://cdn.jwplayer.com/v2/playlists';
  }

  /**
   * Obtiene la URL de la playlist en formato JSON
   */
  getPlaylistJsonUrl(playlistId: string): string {
    return `${this.cdnBaseUrl}/${playlistId}?format=json`;
  }

  /**
   * Obtiene la URL de la playlist en formato RSS
   */
  getPlaylistRssUrl(playlistId: string): string {
    return `${this.cdnBaseUrl}/${playlistId}?format=mrss`;
  }

  /**
   * Obtiene la URL de embed para un video específico
   */
  getVideoEmbedUrl(videoId: string): string {
    return `https://content.jwplatform.com/players/${videoId}.html`;
  }

  /**
   * Fetch de datos de playlist desde el CDN de JWPlayer
   */
  async fetchPlaylistData(playlistId: string): Promise<JWPlayerPlaylistResponse | null> {
    try {
      const url = this.getPlaylistJsonUrl(playlistId);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`No se pudo obtener playlist ${playlistId} desde JWPlayer CDN:`, response.status);
        return null;
      }

      const data = await response.json();
      return data as JWPlayerPlaylistResponse;
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene videos de una playlist específica
   */
  async getPlaylistVideos(playlistId: string): Promise<JWPlayerVideo[]> {
    const playlistData = await this.fetchPlaylistData(playlistId);
    return playlistData?.playlist || [];
  }

  /**
   * Busca videos en una playlist por término
   */
  async searchInPlaylist(playlistId: string, searchTerm: string): Promise<JWPlayerVideo[]> {
    const videos = await this.getPlaylistVideos(playlistId);
    const term = searchTerm.toLowerCase();
    
    return videos.filter(video => 
      video.title.toLowerCase().includes(term) ||
      (video.description && video.description.toLowerCase().includes(term))
    );
  }

  /**
   * Obtiene thumbnail de un video
   */
  getThumbnailUrl(video: JWPlayerVideo): string {
    return video.image || '/images/video-placeholder.jpg';
  }

  /**
   * Verifica si una playlist existe
   */
  async isPlaylistAvailable(playlistId: string): Promise<boolean> {
    try {
      const url = this.getPlaylistJsonUrl(playlistId);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton del servicio
export const jwPlayerCDNService = new JWPlayerCDNService();
