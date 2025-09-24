/**
 * Servicio completo para gestión de playlists
 * Integra con la API completa de playlists incluyendo estructura jerárquica
 */

import apiClient from './apiClient';

// Interfaces completas de la API
export interface PlaylistBase {
  id: string;
  segment_id: number;
  title: string;
  description: string;
  category: string;
  subscription: number;
  subscription_cost: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistWithSeasons extends PlaylistBase {
  seasons: Season[];
}

export interface Season {
  id: number;
  playlist_id: string;
  title: string;
  description?: string;
  season_number: number;
  active: number;
  created_at: string;
  updated_at: string;
  videos?: Video[];
}

export interface Video {
  id: string;
  season_id: number;
  title: string;
  description?: string;
  duration?: number;
  episode_number: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface HomeCarousel {
  id: number;
  link: string;
  imgsrc: string;
  video: string;
  date_time: string;
  active: number;
  order: number;
}

export interface LiveTVChannel {
  id: number;
  name: string;
  url: string;
  number: number;
  logo: string;
}

export interface SegmentWithData {
  id: number;
  name: string;
  livetv: number;
  order: number;
  active: number;
  playlist: PlaylistWithSeasons[];
  livetvlist: LiveTVChannel[];
}

export interface CompletePlaylistData {
  homecarousel: HomeCarousel[];
  segments: SegmentWithData[];
}

export interface PlaylistSearchParams {
  q: string;
  active?: number;
  limit?: number;
}

export interface PlaylistCreateData {
  id: string;
  segment_id: number;
  title: string;
  description: string;
  category: string;
  subscription?: number;
  subscription_cost?: number;
  active?: number;
}

export interface PlaylistUpdateData extends Partial<PlaylistCreateData> {
  updated_at?: string;
}

export class PlaylistsService {
  private readonly baseUrl = '/playlists';

  /**
   * Obtener estructura completa de datos (Home carousel + Segments con playlists anidadas)
   * Reemplaza el endpoint Flask legacy '/playlist'
   */
  async getCompleteData(): Promise<CompletePlaylistData> {
    const response = await apiClient.get<CompletePlaylistData>(this.baseUrl);
    return response.data;
  }

  /**
   * Crear una nueva playlist
   */
  async create(data: PlaylistCreateData): Promise<PlaylistBase> {
    const response = await apiClient.post<PlaylistBase>(this.baseUrl, {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return response.data;
  }

  /**
   * Obtener una playlist específica por ID
   */
  async getById(id: string): Promise<PlaylistBase> {
    const response = await apiClient.get<PlaylistBase>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Actualizar una playlist existente
   */
  async update(id: string, data: PlaylistUpdateData): Promise<PlaylistBase> {
    const response = await apiClient.put<PlaylistBase>(`${this.baseUrl}/${id}`, {
      ...data,
      updated_at: new Date().toISOString()
    });
    return response.data;
  }

  /**
   * Eliminar una playlist
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Buscar playlists por título o descripción
   */
  async search(params: PlaylistSearchParams): Promise<PlaylistBase[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.q);
    
    if (params.active !== undefined) {
      searchParams.append('active', params.active.toString());
    }
    
    if (params.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }

    const response = await apiClient.get<PlaylistBase[]>(`${this.baseUrl}/search?${searchParams}`);
    return response.data;
  }

  /**
   * Obtener playlists de un segmento específico con todos sus detalles (seasons y videos)
   */
  async getBySegment(segmentId: number, active: number = 1): Promise<PlaylistWithSeasons[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('active', active.toString());

    const response = await apiClient.get<PlaylistWithSeasons[]>(
      `${this.baseUrl}/by-segment/${segmentId}?${searchParams}`
    );
    return response.data;
  }

  /**
   * Obtener todas las playlists básicas (para compatibilidad con código existente)
   */
  async getAll(): Promise<PlaylistBase[]> {
    try {
      const completeData = await this.getCompleteData();
      const allPlaylists: PlaylistBase[] = [];
      
      // Extraer todas las playlists de todos los segmentos
      completeData.segments.forEach(segment => {
        segment.playlist.forEach(playlist => {
          // Convertir a PlaylistBase eliminando seasons
          const { seasons, ...playlistBase } = playlist;
          allPlaylists.push(playlistBase);
        });
      });
      
      return allPlaylists;
    } catch (error) {
      console.error('Error obteniendo todas las playlists:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de playlists
   */
  async getStats(): Promise<{
    totalPlaylists: number;
    activePlaylists: number;
    totalSegments: number;
    totalVideos: number;
    totalSeasons: number;
  }> {
    try {
      const completeData = await this.getCompleteData();
      
      let totalPlaylists = 0;
      let activePlaylists = 0;
      let totalVideos = 0;
      let totalSeasons = 0;
      
      completeData.segments.forEach(segment => {
        totalPlaylists += segment.playlist.length;
        
        segment.playlist.forEach(playlist => {
          if (playlist.active === 1) activePlaylists++;
          
          totalSeasons += playlist.seasons.length;
          
          playlist.seasons.forEach(season => {
            if (season.videos) {
              totalVideos += season.videos.length;
            }
          });
        });
      });
      
      return {
        totalPlaylists,
        activePlaylists,
        totalSegments: completeData.segments.length,
        totalVideos,
        totalSeasons
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalPlaylists: 0,
        activePlaylists: 0,
        totalSegments: 0,
        totalVideos: 0,
        totalSeasons: 0
      };
    }
  }

  /**
   * Obtener playlists por categoría
   */
  async getByCategory(category: string): Promise<PlaylistBase[]> {
    const allPlaylists = await this.getAll();
    return allPlaylists.filter(playlist => playlist.category === category);
  }

  /**
   * Obtener categorías únicas
   */
  async getCategories(): Promise<string[]> {
    const allPlaylists = await this.getAll();
    const categories = new Set(allPlaylists.map(p => p.category).filter(Boolean));
    return Array.from(categories);
  }

  /**
   * Validar estructura de playlist antes de crear/actualizar
   */
  validatePlaylistData(data: Partial<PlaylistCreateData>): string[] {
    const errors: string[] = [];
    
    if (!data.title?.trim()) {
      errors.push('El título es requerido');
    }
    
    if (!data.segment_id || data.segment_id <= 0) {
      errors.push('Debe seleccionar un segmento válido');
    }
    
    if (data.subscription_cost && data.subscription_cost < 0) {
      errors.push('El costo de suscripción no puede ser negativo');
    }
    
    if (data.title && data.title.length > 255) {
      errors.push('El título no puede exceder 255 caracteres');
    }
    
    return errors;
  }
}

// Instancia singleton del servicio
export const playlistsService = new PlaylistsService();
