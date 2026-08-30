import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SongGql {
  @Field(() => ID) id: string;
  @Field() title: string;
  @Field() artist: string;
  @Field(() => [String]) composers: string[];
  @Field(() => String, { nullable: true }) album: string | null;
  @Field(() => Int) duration: number;
  @Field(() => String, { nullable: true }) genre: string | null;
  @Field(() => [String]) categorias: string[];
  @Field(() => [String]) tags: string[];
  @Field(() => String, { nullable: true }) coverUrl: string | null;
  @Field() streamUrl: string;
  @Field(() => Int) playCount: number;
  @Field(() => Int) likes: number;
  @Field() fileName: string;
  @Field(() => Int) fileSize: number;
  @Field() uploadDate: string;
}

const toCoverPath = (cover: unknown): string | null => {
  if (cover === null || cover === undefined) return null;
  const c = String(cover);
  if (!c) return null;
  const clean = c
    .replace(/^\/uploads\//, '')
    .replace(/^covers\//, '')
    .replace(/^https?:\/\/[^/]+\/api\/music\/covers\//, '')
    .replace(/^\/api\/music\/covers\//, '');
  return clean ? `/api/music/covers/${clean}` : null;
};

/**
 * Normaliza un doc de Mongo (colecciones 'songs' o 'canciones', o el objeto
 * `song` ya normalizado de favoritos) a SongGql.
 */
export function toSongGql(raw: Record<string, any>): SongGql | null {
  if (!raw?._id) return null;
  const id = String(raw._id);
  const uploaded = raw.uploadDate ?? raw.createdAt ?? raw.fecha_subida ?? new Date();
  return {
    id,
    title: String(raw.title ?? raw.titulo ?? 'Sin título'),
    artist: String(raw.artist ?? raw.artistas?.[0]?.nombre ?? 'Artista desconocido'),
    composers: raw.composers ?? [],
    album: raw.album ?? raw.album_info?.titulo ?? null,
    duration: Number(raw.duration ?? raw.duracion_segundos ?? 0),
    genre: raw.genre ?? raw.categorias?.[0] ?? null,
    categorias: raw.categorias ?? [],
    tags: raw.tags ?? [],
    coverUrl: toCoverPath(raw.coverUrl ?? raw.portada_url ?? raw.album_info?.portada_url),
    streamUrl: `/api/music/songs/${id}/stream`,
    playCount: Number(raw.playCount ?? raw.reproducciones ?? 0),
    likes: Number(raw.likes ?? 0),
    fileName: String(raw.fileName ?? raw.archivo_url ?? ''),
    fileSize: Number(raw.fileSize ?? 0),
    uploadDate:
      uploaded instanceof Date ? uploaded.toISOString() : String(uploaded),
  };
}
