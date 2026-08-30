import type { Song } from './song';

export type ArtistRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ArtistRequest {
  _id: string;
  userId: string;
  email: string;
  artistName: string;
  genre?: string | null;
  description?: string | null;
  links?: string | null;
  status: ArtistRequestStatus;
  rejectReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface ArtistRequestUser {
  _id: string;
  name: string;
  email: string;
}

export interface ArtistRequestWithUser extends ArtistRequest {
  user: ArtistRequestUser | null;
}

export interface ArtistMyMusic {
  user: {
    name: string;
    artistName: string | null;
  };
  albums: (Album & { songs: Song[]; totalDuration: number })[];
  singles: Song[];
}

export type AlbumType = 'album' | 'single' | 'ep' | 'compilacion';

export interface Album {
  _id: string;
  titulo: string;
  artista_principal_id: string;
  tipo_album: AlbumType;
  fecha_lanzamiento: string | Date;
  portada_url: string;
  descripcion?: string | null;
  categorias?: string[];
  createdAt?: string | Date;
}
