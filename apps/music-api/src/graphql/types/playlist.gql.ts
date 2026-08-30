import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { toSongGql } from './song.gql';

@ObjectType()
export class PlaylistSongGql {
  @Field(() => ID) id: string;
  @Field() titulo: string;
  @Field() artista: string;
  @Field(() => String, { nullable: true }) album: string | null;
  @Field(() => Int) duracion: number;
  @Field(() => Int) orden: number;
  @Field(() => String, { nullable: true }) coverUrl: string | null;
  @Field() streamUrl: string;
}

@ObjectType()
export class PlaylistGql {
  @Field(() => ID) id: string;
  @Field() titulo: string;
  @Field({ nullable: true }) descripcion: string;
  @Field(() => Boolean) esPrivada: boolean;
  @Field(() => Boolean) esColaborativa: boolean;
  @Field(() => Int) totalCanciones: number;
  @Field(() => Int) duracionTotal: number;
  @Field(() => Int) seguidores: number;
  @Field(() => Int) reproducciones: number;
  @Field() fechaCreacion: string;
  @Field() fechaActualizacion: string;
  @Field(() => [PlaylistSongGql]) songs: PlaylistSongGql[];
}

@InputType()
export class CreatePlaylistInput {
  @Field() titulo: string;
  @Field({ nullable: true }) descripcion?: string;
  @Field(() => Boolean, { nullable: true, defaultValue: false }) esPrivada?: boolean;
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  esColaborativa?: boolean;
}

export function toPlaylistGql(doc: Record<string, any>): PlaylistGql {
  const iso = (d: unknown) =>
    d instanceof Date ? d.toISOString() : String(d ?? new Date().toISOString());
  return {
    id: String(doc._id),
    titulo: String(doc.titulo ?? 'Sin título'),
    descripcion: String(doc.descripcion ?? ''),
    esPrivada: !!doc.es_privada,
    esColaborativa: !!doc.es_colaborativa,
    totalCanciones: Number(doc.total_canciones ?? 0),
    duracionTotal: Number(doc.duracion_total ?? 0),
    seguidores: Number(doc.seguidores ?? 0),
    reproducciones: Number(doc.reproducciones ?? 0),
    fechaCreacion: iso(doc.fecha_creacion),
    fechaActualizacion: iso(doc.fecha_actualizacion),
    songs: (doc.canciones ?? [])
      .map((c: Record<string, any>) => {
        const embedded = c.cancion_completa ?? {
          _id: c.cancion_id,
          title: c.titulo,
          artist: c.artistas?.[0]?.nombre,
          duration: c.duracion,
        };
        const song = toSongGql(embedded);
        if (!song) return null;
        return {
          id: song.id,
          titulo: song.title,
          artista: song.artist,
          album: song.album,
          duracion: song.duration,
          orden: Number(c.orden ?? 0),
          coverUrl: song.coverUrl,
          streamUrl: song.streamUrl,
        };
      })
      .filter(
        (s: PlaylistSongGql | null): s is PlaylistSongGql => s !== null,
      ),
  };
}

export enum SearchType {
  GENERAL = 'general',
  ARTIST = 'artist',
  SONG = 'song',
  CATEGORY = 'category',
}

registerEnumType(SearchType, { name: 'SearchType' });
