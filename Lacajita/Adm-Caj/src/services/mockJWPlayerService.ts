/**
 * Servicio temporal para trabajar directamente con JWPlayer CDN
 * sin depender del backend que está devolviendo error 500
 */

import { jwPlayerCDNService } from './jwPlayerCDNService';

// Configuración de playlists conocidas de JWPlayer para La Cajita TV
let KNOWN_PLAYLISTS = {
  // Estas son las playlists que tienes configuradas en JWPlayer
  // Necesitarás reemplazar estos IDs con los reales de tu cuenta
  FEATURED: 'YOUR_FEATURED_PLAYLIST_ID',
  RECENT: 'YOUR_RECENT_PLAYLIST_ID',
  POPULAR: 'YOUR_POPULAR_PLAYLIST_ID',
  DOCUMENTARIES: 'YOUR_DOCUMENTARIES_PLAYLIST_ID',
  SERIES: 'YOUR_SERIES_PLAYLIST_ID'
};

export interface MockVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  mediaId: string;
  playlistId: string;
  embedUrl: string;
  publishDate: Date;
  category: string;
}

export interface MockPlaylist {
  id: string;
  title: string;
  description: string;
  videoCount: number;
  videos: MockVideo[];
}

export class MockJWPlayerService {
  /**
   * Genera datos de prueba para desarrollo
   */
  async getMockVideos(): Promise<MockVideo[]> {
    // Datos de prueba mientras configuramos la integración real
    const mockVideos: MockVideo[] = [
      {
        id: '1',
        title: 'La Cajita TV - Episodio 001',
        description: 'Primer episodio de nuestra serie principal donde exploramos...',
        thumbnail: 'https://via.placeholder.com/640x360?text=La+Cajita+TV+001',
        duration: 1800, // 30 minutos
        mediaId: 'demo-media-001',
        playlistId: KNOWN_PLAYLISTS.FEATURED,
        embedUrl: jwPlayerCDNService.getVideoEmbedUrl('demo-media-001'),
        publishDate: new Date('2024-01-15'),
        category: 'Featured'
      },
      {
        id: '2',
        title: 'Especial Documental - Historia Local',
        description: 'Un recorrido por la historia de nuestra región...',
        thumbnail: 'https://via.placeholder.com/640x360?text=Documental+Historia',
        duration: 2700, // 45 minutos
        mediaId: 'demo-media-002',
        playlistId: KNOWN_PLAYLISTS.DOCUMENTARIES,
        embedUrl: jwPlayerCDNService.getVideoEmbedUrl('demo-media-002'),
        publishDate: new Date('2024-01-10'),
        category: 'Documentaries'
      },
      {
        id: '3',
        title: 'Serie Juventud - Temporada 1 Ep 1',
        description: 'Primera temporada de nuestra serie para jóvenes...',
        thumbnail: 'https://via.placeholder.com/640x360?text=Serie+Juventud',
        duration: 1200, // 20 minutos
        mediaId: 'demo-media-003',
        playlistId: KNOWN_PLAYLISTS.SERIES,
        embedUrl: jwPlayerCDNService.getVideoEmbedUrl('demo-media-003'),
        publishDate: new Date('2024-01-08'),
        category: 'Series'
      }
    ];

    return mockVideos;
  }

  /**
   * Obtiene videos de una playlist específica desde JWPlayer CDN
   */
  async getVideosFromPlaylist(playlistId: string): Promise<MockVideo[]> {
    try {
      const jwPlayerVideos = await jwPlayerCDNService.getPlaylistVideos(playlistId);
      
      return jwPlayerVideos.map((jwVideo, index) => ({
        id: `jwp-${index}`,
        title: jwVideo.title,
        description: jwVideo.description || '',
        thumbnail: jwPlayerCDNService.getThumbnailUrl(jwVideo),
        duration: jwVideo.duration || 0,
        mediaId: jwVideo.mediaid,
        playlistId: playlistId,
        embedUrl: jwPlayerCDNService.getVideoEmbedUrl(jwVideo.mediaid),
        publishDate: new Date(jwVideo.pubdate ? jwVideo.pubdate * 1000 : Date.now()),
        category: 'JWPlayer Content'
      }));
    } catch (error) {
      console.error(`Error obteniendo videos de playlist ${playlistId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene todas las playlists configuradas
   */
  async getMockPlaylists(): Promise<MockPlaylist[]> {
    const playlists: MockPlaylist[] = [];

    for (const [category, playlistId] of Object.entries(KNOWN_PLAYLISTS)) {
      try {
        const videos = await this.getVideosFromPlaylist(playlistId);
        
        playlists.push({
          id: playlistId,
          title: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
          description: `Playlist de ${category} de La Cajita TV`,
          videoCount: videos.length,
          videos: videos
        });
      } catch (error) {
        console.warn(`No se pudo cargar playlist ${category}:`, error);
        // Agregar playlist vacía para mostrar en la UI
        playlists.push({
          id: playlistId,
          title: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
          description: `Playlist de ${category} (temporalmente no disponible)`,
          videoCount: 0,
          videos: []
        });
      }
    }

    return playlists;
  }

  /**
   * Busca videos por término
   */
  async searchVideos(searchTerm: string): Promise<MockVideo[]> {
    const allVideos = await this.getMockVideos();
    const term = searchTerm.toLowerCase();
    
    return allVideos.filter(video => 
      video.title.toLowerCase().includes(term) ||
      video.description.toLowerCase().includes(term) ||
      video.category.toLowerCase().includes(term)
    );
  }

  /**
   * Obtiene estadísticas del servicio
   */
  async getStats(): Promise<{
    totalVideos: number;
    totalPlaylists: number;
    categories: string[];
  }> {
    const videos = await this.getMockVideos();
    const playlists = await this.getMockPlaylists();
    
    const categories = [...new Set(videos.map(v => v.category))];
    
    return {
      totalVideos: videos.length,
      totalPlaylists: playlists.length,
      categories
    };
  }

  /**
   * Configura los playlist IDs reales de JWPlayer
   */
  updatePlaylistIds(newPlaylistIds: Partial<typeof KNOWN_PLAYLISTS>) {
    Object.assign(KNOWN_PLAYLISTS, newPlaylistIds);
  }

  /**
   * Obtiene la configuración actual de playlists
   */
  getPlaylistConfig() {
    return { ...KNOWN_PLAYLISTS };
  }
}

// Instancia singleton del servicio
export const mockJWPlayerService = new MockJWPlayerService();
