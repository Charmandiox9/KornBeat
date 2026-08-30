export interface Song {
  _id: string;
  title: string;
  artist: string;
  composers: string[];
  album: string;
  duration: number;
  genre: string;
  categorias: string[];
  tags: string[];
  fileName: string;
  fileSize: number;
  coverUrl: string | null;
  uploadDate: string | Date;
  playCount: number;
  likes?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SongSearchResponse {
  success: true;
  data: Song[];
  count: number;
  searchType?: 'artist' | 'song' | 'category' | 'general';
  query?: string;
  results?: {
    byTitle: Song[];
    byArtist: Song[];
    byAlbum: Song[];
    byGenre: Song[];
  };
}

export interface FavoriteSongSummary {
  _id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  coverUrl: string | null;
  fileName: string;
  playCount: number;
  likes: number;
  source: 'songs' | 'canciones';
  streamUrl?: string;
}

export interface Favorite {
  _id: string;
  usuario_id: string;
  cancion_id: string;
  fecha_like: string | Date;
  song: FavoriteSongSummary;
}

export interface FavoritesResponse {
  success: true;
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  favorites: Favorite[];
}

export interface ReelPosition {
  songId: string;
  position: number;
  progress: number;
  isPlaying: boolean;
  timestamp: number;
  lastUpdated?: number;
  song?: Song | null;
}

export interface ReelPositionResponse {
  success: true;
  hasPosition: boolean;
  position: (ReelPosition & { message?: string }) | null;
  message?: string;
}

export interface ReelHistoryItem {
  songId: string;
  song: Song | null;
}

export interface ReelHistoryResponse {
  success: true;
  count: number;
  history: ReelHistoryItem[];
}
