export interface PlaylistArtist {
  nombre: string;
}

export interface PlaylistSong {
  cancion_id: string;
  titulo: string;
  artistas: PlaylistArtist[];
  duracion: number;
  orden: number;
  fecha_agregada: string | Date;
  agregada_por_usuario_id: string;
  cancion_completa?: Record<string, unknown>;
}

export interface Playlist {
  _id: string;
  usuario_creador_id: string;
  titulo: string;
  descripcion: string;
  es_privada: boolean;
  es_colaborativa: boolean;
  canciones: PlaylistSong[];
  total_canciones: number;
  duracion_total: number;
  seguidores: number;
  reproducciones: number;
  fecha_creacion: string | Date;
  fecha_actualizacion: string | Date;
}

export interface UserPlaylistsResponse {
  success: true;
  count: number;
  playlists: Playlist[];
}

export interface CreatePlaylistResponse {
  success: true;
  message: string;
  playlist: Playlist;
}
