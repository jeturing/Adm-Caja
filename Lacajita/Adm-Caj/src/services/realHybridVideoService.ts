/**
 * Servicio híbrido que combina datos de la API de La Cajita TV
 * con videos reales de JWPlayer CDN usando los playlist IDs
 */

import { videosService, playlistsService } from './entities';
import { jwPlayerCDNService, JWPlayerVideo } from './jwPlayerCDNService';
import { Video, Playlist } from '../types/entities';

// Interfaz para video enriquecido con datos de JWPlayer
export interface EnhancedVideo extends Video {
  // Datos adicionales de JWPlayer
  jwPlayer?: {
    available: boolean;
    title?: string;
    description?: string;
    duration?: number;
    thumbnail?: string;
    embedUrl?: string;
    playlistId?: string;
    mediaId?: string;
  };
  // Estado de sincronización
  syncStatus: 'synced' | 'missing_jwplayer' | 'api_only' | 'jwplayer_only';
}

// Interfaz para estadísticas del servicio híbrido
export interface HybridVideoStats {
  totalApiVideos: number;
  totalJWPlayerVideos: number;
  syncedVideos: number;
  missingInJWPlayer: number;
  onlyInAPI: number;
  availablePlaylists: number;
  totalPlaylists: number;
}

export class HybridVideoService {
  /**
   * Obtiene videos enriquecidos combinando datos de API y JWPlayer
   */
  async getEnhancedVideos(): Promise<EnhancedVideo[]> {
    try {
      // 1. Obtener videos de la API
      const apiVideos = await videosService.getAll();
      
      // 2. Obtener playlists para tener los playlist_ids
      const playlists = await playlistsService.getAll();
      
      // 3. Crear un mapa de season_id -> playlist_id
      const seasonToPlaylistMap = new Map<number, string>();
      playlists.forEach(playlist => {
        // Asumiendo que playlist.playlist_id es el ID de JWPlayer
        seasonToPlaylistMap.set(playlist.segment_id, playlist.playlist_id);
      });

      // 4. Enriquecer cada video con datos de JWPlayer
      const enhancedVideos: EnhancedVideo[] = [];
      
      for (const apiVideo of apiVideos) {
        const playlistId = seasonToPlaylistMap.get(apiVideo.season_id);
        
        if (!playlistId) {
          // Video sin playlist asociada
          enhancedVideos.push({
            ...apiVideo,
            syncStatus: 'api_only',
            jwPlayer: {
              available: false
            }
          });
          continue;
        }

        try {
          // Buscar este video específico en la playlist de JWPlayer
          const jwVideos = await jwPlayerCDNService.getPlaylistVideos(playlistId);
          const matchedJWVideo = this.findMatchingVideo(apiVideo, jwVideos);

          if (matchedJWVideo) {
            enhancedVideos.push({
              ...apiVideo,
              syncStatus: 'synced',
              jwPlayer: {
                available: true,
                title: matchedJWVideo.title,
                description: matchedJWVideo.description,
                duration: matchedJWVideo.duration,
                thumbnail: jwPlayerCDNService.getThumbnailUrl(matchedJWVideo),
                embedUrl: jwPlayerCDNService.getVideoEmbedUrl(matchedJWVideo.mediaid),
                playlistId: playlistId,
                mediaId: matchedJWVideo.mediaid
              }
            });
          } else {
            enhancedVideos.push({
              ...apiVideo,
              syncStatus: 'missing_jwplayer',
              jwPlayer: {
                available: false,
                playlistId: playlistId
              }
            });
          }
        } catch (error) {
          console.error(`Error procesando video ${apiVideo.video_id}:`, error);
          enhancedVideos.push({
            ...apiVideo,
            syncStatus: 'api_only',
            jwPlayer: {
              available: false,
              playlistId: playlistId
            }
          });
        }
      }

      return enhancedVideos;
    } catch (error) {
      console.error('Error en getEnhancedVideos:', error);
      return [];
    }
  }

  /**
   * Busca un video de la API en los videos de JWPlayer
   * Utiliza diferentes estrategias de matching
   */
  private findMatchingVideo(apiVideo: Video, jwVideos: JWPlayerVideo[]): JWPlayerVideo | null {
    if (!jwVideos || jwVideos.length === 0) return null;

    // Estrategia 1: Buscar por video_id exacto
    let match = jwVideos.find(jw => jw.mediaid === apiVideo.video_id);
    if (match) return match;

    // Estrategia 2: Buscar por título similar
    const apiTitle = apiVideo.title.toLowerCase().trim();
    match = jwVideos.find(jw => 
      jw.title.toLowerCase().trim() === apiTitle
    );
    if (match) return match;

    // Estrategia 3: Buscar por título parcial (si el título contiene palabras clave)
    const apiWords = apiTitle.split(' ').filter(word => word.length > 3);
    if (apiWords.length > 0) {
      match = jwVideos.find(jw => {
        const jwTitle = jw.title.toLowerCase();
        return apiWords.some(word => jwTitle.includes(word));
      });
      if (match) return match;
    }

    return null;
  }

  /**
   * Obtiene estadísticas del estado de sincronización
   */
  async getSyncStatus(): Promise<HybridVideoStats> {
    try {
      const enhancedVideos = await this.getEnhancedVideos();
      const playlists = await playlistsService.getAll();
      
      // Calcular estadísticas de playlists disponibles
      let availablePlaylists = 0;
      const uniquePlaylistIds = new Set(playlists.map(p => p.playlist_id));
      
      for (const playlistId of uniquePlaylistIds) {
        const isAvailable = await jwPlayerCDNService.isPlaylistAvailable(playlistId);
        if (isAvailable) availablePlaylists++;
      }

      const stats: HybridVideoStats = {
        totalApiVideos: enhancedVideos.length,
        totalJWPlayerVideos: enhancedVideos.filter(v => v.jwPlayer?.available).length,
        syncedVideos: enhancedVideos.filter(v => v.syncStatus === 'synced').length,
        missingInJWPlayer: enhancedVideos.filter(v => v.syncStatus === 'missing_jwplayer').length,
        onlyInAPI: enhancedVideos.filter(v => v.syncStatus === 'api_only').length,
        availablePlaylists,
        totalPlaylists: uniquePlaylistIds.size
      };

      return stats;
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      return {
        totalApiVideos: 0,
        totalJWPlayerVideos: 0,
        syncedVideos: 0,
        missingInJWPlayer: 0,
        onlyInAPI: 0,
        availablePlaylists: 0,
        totalPlaylists: 0
      };
    }
  }

  /**
   * Busca videos enriquecidos por término
   */
  async searchVideos(searchTerm: string): Promise<EnhancedVideo[]> {
    const allVideos = await this.getEnhancedVideos();
    const term = searchTerm.toLowerCase();

    return allVideos.filter(video => 
      video.title.toLowerCase().includes(term) ||
      (video.description && video.description.toLowerCase().includes(term)) ||
      (video.jwPlayer?.title && video.jwPlayer.title.toLowerCase().includes(term)) ||
      (video.jwPlayer?.description && video.jwPlayer.description.toLowerCase().includes(term))
    );
  }

  /**
   * Obtiene videos por estado de sincronización
   */
  async getVideosBySyncStatus(status: EnhancedVideo['syncStatus']): Promise<EnhancedVideo[]> {
    const allVideos = await this.getEnhancedVideos();
    return allVideos.filter(video => video.syncStatus === status);
  }

  /**
   * Obtiene información de playlists con su estado
   */
  async getPlaylistsWithStatus(): Promise<Array<Playlist & { available: boolean; videoCount?: number }>> {
    try {
      const playlists = await playlistsService.getAll();
      const playlistsWithStatus = [];

      for (const playlist of playlists) {
        const available = await jwPlayerCDNService.isPlaylistAvailable(playlist.playlist_id);
        let videoCount = 0;

        if (available) {
          try {
            const videos = await jwPlayerCDNService.getPlaylistVideos(playlist.playlist_id);
            videoCount = videos.length;
          } catch (error) {
            console.warn(`Error obteniendo videos de playlist ${playlist.playlist_id}:`, error);
          }
        }

        playlistsWithStatus.push({
          ...playlist,
          available,
          videoCount
        });
      }

      return playlistsWithStatus;
    } catch (error) {
      console.error('Error obteniendo playlists con estado:', error);
      return [];
    }
  }
}

// Instancia singleton del servicio
export const hybridVideoService = new HybridVideoService();
