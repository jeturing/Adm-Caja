// Interfaces para las entidades de La Cajita TV API

export interface HomeCarousel {
  id: number;
  title: string;
  description?: string;
  image: string;
  url?: string;
  active: number;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Segment {
  id: number;
  name: string;
  description?: string;
  image?: string;
  active: number;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Playlist {
  id: number;
  playlist_id: string;
  segment_id: number;
  active: number;
  title: string;
  description?: string;
  thumbnail?: string;
  published_at?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Season {
  id: number;
  season_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  season_number: number;
  published_at?: string;
  active: number;
  created_at?: string;
  updated_at?: string;
}

export interface Video {
  video_id: string;
  season_id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  published_at?: string;
  tags?: string;
  view_count?: number;
  active: number;
  created_at?: string;
  updated_at?: string;
}

// Interfaces para respuestas de estadísticas
export interface SystemStats {
  total_segments: number;
  total_playlists: number;
  total_seasons: number;
  total_videos: number;
  active_segments: number;
  active_playlists: number;
  active_seasons: number;
  active_videos: number;
}

export interface SegmentSummary {
  segment: Segment;
  playlists_count: number;
  seasons_count: number;
  videos_count: number;
}

// Interfaces para respuestas de API
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Interfaces para formularios
export interface CreateHomeCarouselForm {
  title: string;
  description?: string;
  image: string;
  url?: string;
  active: number;
  order: number;
}

export interface CreateSegmentForm {
  name: string;
  description?: string;
  image?: string;
  active: number;
  order: number;
}

export interface CreatePlaylistForm {
  playlist_id: string;
  segment_id: number;
  active: number;
  title: string;
  description?: string;
  thumbnail?: string;
  published_at?: string;
  tags?: string;
}

export interface CreateSeasonForm {
  season_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  season_number: number;
  published_at?: string;
  active: number;
}

export interface CreateVideoForm {
  video_id: string;
  season_id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  published_at?: string;
  tags?: string;
  view_count?: number;
  active: number;
}
