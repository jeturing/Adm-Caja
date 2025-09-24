/**
 * Servicio real para La Cajita TV API
 * Se conecta al backend real según la documentación
 */

import { authFlowService } from './authFlowService';

// Interfaces basadas en la API documentada
export interface ApiVideo {
  id: string;
  season_id: string;
  title?: string;
  description?: string;
  url?: string;
  active?: boolean;
  order?: number;
  video_type?: number;
  language?: string;
  thumbnail?: string;
  duration?: number;
  quality?: string;
  file_size?: number;
  format?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiSeason {
  id?: number;
  playlist_id: string;
  title?: string;
  description?: string;
  date?: string;
  active?: number;
  videos?: string[];
}

export interface ApiPlaylist {
  id: string;
  segment_id?: number;
  title?: string;
  description?: string;
  category?: string;
  subscription?: number;
  subscription_cost?: number;
  active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPlaylistComplete extends ApiPlaylist {
  seasons: ApiSeasonComplete[];
}

export interface ApiSeasonComplete extends ApiSeason {
  videos: string[]; // Lista de video_ids
}

export interface ApiSegment {
  id?: number;
  name: string;
  livetv?: number;
  order?: number;
  active?: number;
  playlist?: ApiPlaylistComplete[]; // Añadir playlists anidadas
}

export interface ApiSegmentComplete extends ApiSegment {
  playlist?: ApiPlaylistComplete[];
  livetvlist?: ApiLiveTVChannel[];
}

export interface ApiHomeCarousel {
  id?: number;
  link?: string;
  imgsrc?: string;
  video?: string;
  date_time?: string;
  active?: number;
  order?: number;
}

export interface ApiLiveTVChannel {
  id?: number;
  name?: string;
  url?: string;
  number?: number;
  logo?: string;
}

export interface SystemStats {
  total_playlists: number;
  total_seasons: number;
  total_videos: number;
  total_segments: number;
  total_carousel_items: number;
  last_updated: string;
}

// Nueva interfaz para la respuesta completa del endpoint /playlists
export interface ApiCompletePlaylistData {
  homecarousel: ApiHomeCarousel[];
  segments: ApiSegmentComplete[];
}

export class LaCajitaAPIService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Usar authFlowService para hacer requests autenticados
      const response = await authFlowService.makeAuthenticatedRequest(endpoint, options);
      
      if (response.ok) {
        return await response.json();
      } else {
        console.log('❌ Error en request:', response.status, endpoint);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ makeRequest error:', error);
      throw error;
    }
  }

  // ===== ENDPOINTS DE VIDEOS =====
  async getVideos(active?: number): Promise<ApiVideo[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.makeRequest<ApiVideo[]>(`/videos${params}`);
  }

  async createVideo(video: Omit<ApiVideo, 'date'>): Promise<ApiVideo> {
    return this.makeRequest<ApiVideo>('/videos', {
      method: 'POST',
      body: JSON.stringify(video)
    });
  }

  async getVideo(seasonId: number, videoId: string): Promise<ApiVideo> {
    return this.makeRequest<ApiVideo>(`/videos/${seasonId}/${videoId}`);
  }

  async updateVideo(seasonId: number, videoId: string, video: ApiVideo): Promise<ApiVideo> {
    return this.makeRequest<ApiVideo>(`/videos/${seasonId}/${videoId}`, {
      method: 'PUT',
      body: JSON.stringify(video)
    });
  }

  async deleteVideo(seasonId: number, videoId: string): Promise<void> {
    return this.makeRequest<void>(`/videos/${seasonId}/${videoId}`, {
      method: 'DELETE'
    });
  }

  // ===== ENDPOINTS DE PLAYLISTS =====
  // Listar todas las playlists (usa endpoint real /manplaylists)
  async getPlaylists(): Promise<ApiPlaylist[]> {
    const raw: any[] = await this.makeRequest<any[]>('/manplaylists');
    // mapear a ApiPlaylist mínimo
    return raw.map((p) => ({
      id: p.id,
      title: p.title || p.id,
      description: p.description,
      category: p.category,
      subscription: p.subscription,
      subscription_cost: p.subscription_cost,
      active: p.active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    } as ApiPlaylist));
  }
  async createPlaylist(playlist: Omit<ApiPlaylist, 'id' | 'created_at' | 'updated_at'>): Promise<ApiPlaylist> {
    return this.makeRequest<ApiPlaylist>('/playlists', {
      method: 'POST',
      body: JSON.stringify(playlist)
    });
  }

  async getPlaylist(playlistId: string): Promise<ApiPlaylist> {
    return this.makeRequest<ApiPlaylist>(`/playlists/${playlistId}`);
  }

  async updatePlaylist(playlistId: string, playlist: ApiPlaylist): Promise<ApiPlaylist> {
    return this.makeRequest<ApiPlaylist>(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify(playlist)
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    return this.makeRequest<void>(`/playlists/${playlistId}`, {
      method: 'DELETE'
    });
  }

  async searchPlaylists(query: string, active = 1, limit = 50): Promise<ApiPlaylist[]> {
    const params = new URLSearchParams({
      q: query,
      active: active.toString(),
      limit: limit.toString()
    });
    return this.makeRequest<ApiPlaylist[]>(`/playlists/search?${params}`);
  }

  async getPlaylistsBySegment(segmentId: number, active = 1): Promise<ApiPlaylistComplete[]> {
    const params = new URLSearchParams({
      active: active.toString()
    });
    return this.makeRequest<ApiPlaylistComplete[]>(`/playlists/by-segment/${segmentId}?${params}`);
  }

  // ===== ENDPOINTS DE SEASONS =====
  async getSeasons(_active?: number): Promise<ApiSeason[]> {
    // El backend actual no filtra por active en /seasons
    return this.makeRequest<ApiSeason[]>(`/seasons`);
  }

  async createSeason(season: Omit<ApiSeason, 'id'>): Promise<ApiSeason> {
    // Backend espera: { id: 0, playlist_id, name, delete:false }
    const payload = {
      id: 0,
      playlist_id: season.playlist_id,
      name: season.title || season.description || 'Season',
      delete: false,
    };
    await this.makeRequest<unknown>('/iuseason', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Devolver lo enviado como confirmación; la lista real se recarga afuera
    return { ...season } as ApiSeason;
  }

  async getSeason(seasonId: number): Promise<ApiSeason> {
    const list = await this.getSeasons();
    const found = list.find((s: any) => Number(s.id) === Number(seasonId));
    if (!found) throw new Error('Season no encontrada');
    return found as ApiSeason;
  }

  async updateSeason(seasonId: number, season: ApiSeason): Promise<ApiSeason> {
    const payload = {
      id: seasonId,
      playlist_id: season.playlist_id,
      name: season.title || season.description || `Season ${seasonId}`,
      delete: false,
    };
    await this.makeRequest<unknown>('/iuseason', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ...season, id: seasonId } as ApiSeason;
  }

  async deleteSeason(seasonId: number): Promise<void> {
    const payload = { id: seasonId, playlist_id: '', name: '', delete: true };
    await this.makeRequest<unknown>('/iuseason', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ===== ENDPOINTS DE SEGMENTS =====
  async getSegments(active?: number): Promise<ApiSegment[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.makeRequest<ApiSegment[]>(`/segments${params}`);
  }

  async createSegment(segment: Omit<ApiSegment, 'id'>): Promise<ApiSegment> {
    return this.makeRequest<ApiSegment>('/segments', {
      method: 'POST',
      body: JSON.stringify(segment)
    });
  }

  async getSegment(segmentId: number): Promise<ApiSegment> {
    return this.makeRequest<ApiSegment>(`/segments/${segmentId}`);
  }

  async updateSegment(segmentId: number, segment: ApiSegment): Promise<ApiSegment> {
    return this.makeRequest<ApiSegment>(`/segments/${segmentId}`, {
      method: 'PUT',
      body: JSON.stringify(segment)
    });
  }

  async deleteSegment(segmentId: number): Promise<void> {
    return this.makeRequest<void>(`/segments/${segmentId}`, {
      method: 'DELETE'
    });
  }

  async getSegmentSummary(segmentId: number): Promise<any> {
    return this.makeRequest<any>(`/segments/${segmentId}/summary`);
  }

  // ===== ENDPOINTS DE HOME CAROUSEL =====
  async getHomeCarousel(active?: number): Promise<ApiHomeCarousel[]> {
    const params = active !== undefined ? `?active=${active}` : '';
    return this.makeRequest<ApiHomeCarousel[]>(`/home-carousel${params}`);
  }

  async createHomeCarousel(item: Omit<ApiHomeCarousel, 'id'>): Promise<ApiHomeCarousel> {
    return this.makeRequest<ApiHomeCarousel>('/home-carousel', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  async getHomeCarouselItem(itemId: number): Promise<ApiHomeCarousel> {
    return this.makeRequest<ApiHomeCarousel>(`/home-carousel/${itemId}`);
  }

  async updateHomeCarousel(itemId: number, item: ApiHomeCarousel): Promise<ApiHomeCarousel> {
    return this.makeRequest<ApiHomeCarousel>(`/home-carousel/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
  }

  async deleteHomeCarousel(itemId: number): Promise<void> {
    return this.makeRequest<void>(`/home-carousel/${itemId}`, {
      method: 'DELETE'
    });
  }

  // ===== ENDPOINTS DE ESTADÍSTICAS =====
  async getSystemOverview(): Promise<SystemStats> {
    return this.makeRequest<SystemStats>('/stats/overview');
  }

  // ===== HEALTH CHECKS =====
  async checkHealth(): Promise<any> {
    return this.makeRequest<any>('/health');
  }

  async checkPlaylistHealth(): Promise<any> {
    return this.makeRequest<any>('/playlist/health');
  }

  // ===== MÉTODO PARA VERIFICAR CONECTIVIDAD =====
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      console.warn('Backend no disponible:', error);
      return false;
    }
  }

  // ===== ENDPOINT PRINCIPAL COMPLETO =====
  /**
   * Obtener estructura completa de datos incluyendo:
   * - Home carousel
   * - Segments con sus playlists anidadas  
   * - Seasons con sus videos
   * - Canales de LiveTV para segments de tipo LiveTV
   * 
   * Este endpoint reemplaza la funcionalidad del endpoint Flask legacy '/playlist'
   */
  async getCompletePlaylistData(): Promise<ApiCompletePlaylistData> {
    return this.makeRequest<ApiCompletePlaylistData>('/playlists');
  }
}

// Instancia singleton
export const realApiService = new LaCajitaAPIService();
