import { apiService } from './apiService';
import { API_CONFIG } from '../config/api';
import { 
  HomeCarousel, 
  Segment, 
  Playlist, 
  Season, 
  Video,
  SystemStats,
  SegmentSummary
} from '../types/entities';

// Servicio para HomeCarousel
export class HomeCarouselService {
  async getAll(active?: number): Promise<HomeCarousel[]> {
    const endpoint = active !== undefined 
      ? `${API_CONFIG.ENDPOINTS.HOME_CAROUSEL}?active=${active}`
      : API_CONFIG.ENDPOINTS.HOME_CAROUSEL;
    
    const response = await apiService.get<HomeCarousel[]>(endpoint);
    return response.data || [];
  }

  async getById(id: number): Promise<HomeCarousel | null> {
    const response = await apiService.get<HomeCarousel>(`${API_CONFIG.ENDPOINTS.HOME_CAROUSEL}/${id}`);
    return response.data || null;
  }

  async create(item: Omit<HomeCarousel, 'id'>): Promise<HomeCarousel | null> {
    const response = await apiService.post<HomeCarousel>(API_CONFIG.ENDPOINTS.HOME_CAROUSEL, item);
    return response.data || null;
  }

  async update(id: number, item: Partial<HomeCarousel>): Promise<HomeCarousel | null> {
    const response = await apiService.put<HomeCarousel>(`${API_CONFIG.ENDPOINTS.HOME_CAROUSEL}/${id}`, item);
    return response.data || null;
  }

  async delete(id: number): Promise<boolean> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.HOME_CAROUSEL}/${id}`);
    return response.status === 204;
  }
}

// Servicio para Segments
export class SegmentsService {
  async getAll(active?: number): Promise<Segment[]> {
    const endpoint = active !== undefined 
      ? `${API_CONFIG.ENDPOINTS.SEGMENTS}?active=${active}`
      : API_CONFIG.ENDPOINTS.SEGMENTS;
    
    const response = await apiService.get<Segment[]>(endpoint);
    return response.data || [];
  }

  async getById(id: number): Promise<Segment | null> {
    const response = await apiService.get<Segment>(`${API_CONFIG.ENDPOINTS.SEGMENTS}/${id}`);
    return response.data || null;
  }

  async create(item: Omit<Segment, 'id'>): Promise<Segment | null> {
    const response = await apiService.post<Segment>(API_CONFIG.ENDPOINTS.SEGMENTS, item);
    return response.data || null;
  }

  async update(id: number, item: Partial<Segment>): Promise<Segment | null> {
    const response = await apiService.put<Segment>(`${API_CONFIG.ENDPOINTS.SEGMENTS}/${id}`, item);
    return response.data || null;
  }

  async delete(id: number): Promise<boolean> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.SEGMENTS}/${id}`);
    return response.status === 204;
  }

  async getSummary(id: number): Promise<SegmentSummary | null> {
    const response = await apiService.get<SegmentSummary>(`${API_CONFIG.ENDPOINTS.SEGMENTS}/${id}/summary`);
    return response.data || null;
  }
}

// Servicio para Playlists
export class PlaylistsService {
  async getAll(active?: number): Promise<Playlist[]> {
    const endpoint = active !== undefined 
      ? `${API_CONFIG.ENDPOINTS.PLAYLISTS}?active=${active}`
      : API_CONFIG.ENDPOINTS.PLAYLISTS;
    
    const response = await apiService.get<Playlist[]>(endpoint);
    return response.data || [];
  }

  async getById(id: string): Promise<Playlist | null> {
    const response = await apiService.get<Playlist>(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${id}`);
    return response.data || null;
  }

  async create(item: Playlist): Promise<Playlist | null> {
    const response = await apiService.post<Playlist>(API_CONFIG.ENDPOINTS.PLAYLISTS, item);
    return response.data || null;
  }

  async update(id: string, item: Partial<Playlist>): Promise<Playlist | null> {
    const response = await apiService.put<Playlist>(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${id}`, item);
    return response.data || null;
  }

  async delete(id: string): Promise<boolean> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${id}`);
    return response.status === 204;
  }

  async search(query: string, active: number = 1, limit: number = 50): Promise<Playlist[]> {
    const response = await apiService.get<Playlist[]>(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/search?q=${encodeURIComponent(query)}&active=${active}&limit=${limit}`);
    return response.data || [];
  }

  async getBySegment(segmentId: number, active: number = 1): Promise<Playlist[]> {
    const response = await apiService.get<Playlist[]>(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/by-segment/${segmentId}?active=${active}`);
    return response.data || [];
  }
}

// Servicio para Seasons
export class SeasonsService {
  async getAll(active?: number): Promise<Season[]> {
    const endpoint = active !== undefined 
      ? `${API_CONFIG.ENDPOINTS.SEASONS}?active=${active}`
      : API_CONFIG.ENDPOINTS.SEASONS;
    
    const response = await apiService.get<Season[]>(endpoint);
    return response.data || [];
  }

  async getById(id: number): Promise<Season | null> {
    const response = await apiService.get<Season>(`${API_CONFIG.ENDPOINTS.SEASONS}/${id}`);
    return response.data || null;
  }

  async create(item: Omit<Season, 'id'>): Promise<Season | null> {
    const response = await apiService.post<Season>(API_CONFIG.ENDPOINTS.SEASONS, item);
    return response.data || null;
  }

  async update(id: number, item: Partial<Season>): Promise<Season | null> {
    const response = await apiService.put<Season>(`${API_CONFIG.ENDPOINTS.SEASONS}/${id}`, item);
    return response.data || null;
  }

  async delete(id: number): Promise<boolean> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.SEASONS}/${id}`);
    return response.status === 204;
  }
}

// Servicio para Videos
export class VideosService {
  async getAll(active?: number): Promise<Video[]> {
    const endpoint = active !== undefined 
      ? `${API_CONFIG.ENDPOINTS.VIDEOS}?active=${active}`
      : API_CONFIG.ENDPOINTS.VIDEOS;
    
    const response = await apiService.get<Video[]>(endpoint);
    return response.data || [];
  }

  async getById(seasonId: number, videoId: string): Promise<Video | null> {
    const response = await apiService.get<Video>(`${API_CONFIG.ENDPOINTS.VIDEOS}/${seasonId}/${videoId}`);
    return response.data || null;
  }

  async create(item: Video): Promise<Video | null> {
    const response = await apiService.post<Video>(API_CONFIG.ENDPOINTS.VIDEOS, item);
    return response.data || null;
  }

  async update(seasonId: number, videoId: string, item: Partial<Video>): Promise<Video | null> {
    const response = await apiService.put<Video>(`${API_CONFIG.ENDPOINTS.VIDEOS}/${seasonId}/${videoId}`, item);
    return response.data || null;
  }

  async delete(seasonId: number, videoId: string): Promise<boolean> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.VIDEOS}/${seasonId}/${videoId}`);
    return response.status === 204;
  }
}

// Servicio para estadísticas
export class StatsService {
  async getSystemOverview(): Promise<SystemStats | null> {
    const response = await apiService.get<SystemStats>('/stats/overview');
    return response.data || null;
  }

  async getSegmentSummary(segmentId: number): Promise<SegmentSummary | null> {
    const response = await apiService.get<SegmentSummary>(`${API_CONFIG.ENDPOINTS.SEGMENTS}/${segmentId}/summary`);
    return response.data || null;
  }
}

// Instancias de los servicios
export const homeCarouselService = new HomeCarouselService();
export const segmentsService = new SegmentsService();
export const playlistsService = new PlaylistsService();
export const seasonsService = new SeasonsService();
export const videosService = new VideosService();
export const statsService = new StatsService();
