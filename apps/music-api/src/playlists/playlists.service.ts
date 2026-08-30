import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { MONGO_COLLECTIONS } from '@kornbeat/shared';
import { SongsService } from '../songs/songs.service';

export interface PlaylistDoc {
  _id: Types.ObjectId;
  usuario_creador_id: Types.ObjectId;
  titulo: string;
  descripcion?: string;
  es_privada: boolean;
  es_colaborativa: boolean;
  canciones: any[];
  total_canciones: number;
  duracion_total: number;
  seguidores: number;
  reproducciones: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  [key: string]: any;
}

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly songsService: SongsService,
  ) {}

  private get collection() {
    return this.connection.collection<PlaylistDoc>(MONGO_COLLECTIONS.playlists);
  }

  async findByUser(userId: string): Promise<PlaylistDoc[]> {
    return this.collection
      .find({ usuario_creador_id: new Types.ObjectId(userId) })
      .sort({ fecha_creacion: -1 })
      .toArray();
  }

  async findById(playlistId: string): Promise<PlaylistDoc | null> {
    return this.collection.findOne({ _id: new Types.ObjectId(playlistId) });
  }

  /**
   * GET /playlists/:id — con canciones completas y ordenadas (paridad legacy).
   */
  async findByIdWithSongs(playlistId: string): Promise<PlaylistDoc> {
    const playlist = await this.findById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }

    if (playlist.canciones && playlist.canciones.length > 0) {
      const songIds = playlist.canciones.map((c) => c.cancion_id);
      const songs = await this.songsService.findByIds(
        songIds.map((id) => new Types.ObjectId(id)),
      );

      const songsMap: Record<string, any> = {};
      songs.forEach((song) => {
        songsMap[song._id.toString()] = song.toObject();
      });

      playlist.canciones = playlist.canciones
        .map((playlistSong) => {
          const fullSong = songsMap[
            (playlistSong.cancion_id as Types.ObjectId).toString()
          ];
          if (!fullSong) return null;
          return {
            ...playlistSong,
            cancion_completa: {
              _id: fullSong._id,
              titulo: fullSong.title,
              artistas: [{ nombre: fullSong.artist }],
              album_info: {
                titulo: fullSong.album,
                portada_url: fullSong.coverUrl,
              },
              duracion_segundos: fullSong.duration,
              archivo_url: `/api/music/songs/${fullSong._id}/stream`,
              categorias: fullSong.genre ? [fullSong.genre] : [],
              ...fullSong,
            },
          };
        })
        .filter((song) => song !== null)
        .sort((a, b) => a.orden - b.orden);
    }

    return playlist;
  }

  async create(
    userId: string,
    data: {
      titulo: string;
      descripcion?: string;
      es_privada?: boolean;
      es_colaborativa?: boolean;
    },
  ): Promise<PlaylistDoc> {
    if (!data.titulo || data.titulo.trim() === '') {
      throw new BadRequestException('El título es obligatorio');
    }

    const nuevaPlaylist: PlaylistDoc = {
      _id: new Types.ObjectId(),
      usuario_creador_id: new Types.ObjectId(userId),
      titulo: data.titulo.trim(),
      descripcion: data.descripcion?.trim() || '',
      es_privada: !!data.es_privada,
      es_colaborativa: !!data.es_colaborativa,
      canciones: [],
      total_canciones: 0,
      duracion_total: 0,
      seguidores: 0,
      reproducciones: 0,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    };

    const result = await this.collection.insertOne(nuevaPlaylist);
    return { ...nuevaPlaylist, _id: result.insertedId };
  }

  async update(
    playlistId: string,
    data: {
      titulo?: string;
      descripcion?: string;
      es_privada?: boolean;
      es_colaborativa?: boolean;
    },
  ): Promise<PlaylistDoc> {
    const updateData: Record<string, unknown> = {
      fecha_actualizacion: new Date(),
    };
    if (data.titulo !== undefined) updateData.titulo = data.titulo.trim();
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion.trim();
    if (data.es_privada !== undefined) updateData.es_privada = data.es_privada;
    if (data.es_colaborativa !== undefined)
      updateData.es_colaborativa = data.es_colaborativa;

    // Nota: el legacy usaba result.value (driver v6 devuelve el doc directo);
    // esto era un bug (siempre 404). Aquí se implementa correctamente.
    const updated = await this.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(playlistId) },
      { $set: updateData },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException('Playlist no encontrada');
    }
    return updated;
  }

  async remove(playlistId: string): Promise<void> {
    const result = await this.collection.deleteOne({
      _id: new Types.ObjectId(playlistId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Playlist no encontrada');
    }
  }

  async addSong(
    playlistId: string,
    songId: string,
    userId: string,
  ): Promise<{ _id: string; total_canciones: number; duracion_total: number }> {
    const playlist = await this.findById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }

    const isOwner = playlist.usuario_creador_id.toString() === userId;
    const isCollaborator = playlist.es_colaborativa === true;

    if (!isOwner && !isCollaborator) {
      throw new ForbiddenException(
        'No tienes permisos para modificar esta playlist',
      );
    }

    const existe = (playlist.canciones ?? []).some(
      (c) => (c.cancion_id as Types.ObjectId).toString() === songId,
    );
    if (existe) {
      throw new BadRequestException('La canción ya está en la playlist');
    }

    const cancion = await this.songsService.getSongById(songId);
    if (!cancion) {
      throw new NotFoundException('Canción no encontrada');
    }

    const duracionSegundos = cancion.duracion_segundos || cancion.duration || 0;
    const titulo = cancion.titulo || cancion.title || 'Sin título';
    const artistas =
      cancion.artistas ||
      (cancion.artist ? [{ nombre: cancion.artist }] : []);

    const nuevaCancion = {
      cancion_id: new Types.ObjectId(songId),
      titulo,
      artistas,
      duracion: duracionSegundos,
      orden: (playlist.canciones?.length || 0) + 1,
      fecha_agregada: new Date(),
      agregada_por_usuario_id: new Types.ObjectId(userId),
    };

    const result = await this.collection.updateOne(
      { _id: new Types.ObjectId(playlistId) },
      {
        $push: { canciones: nuevaCancion },
        $inc: {
          total_canciones: 1,
          duracion_total: duracionSegundos,
        },
        $set: { fecha_actualizacion: new Date() },
      } as Record<string, any>,
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('No se pudo agregar la canción');
    }

    return {
      _id: playlistId,
      total_canciones: (playlist.total_canciones || 0) + 1,
      duracion_total: (playlist.duracion_total || 0) + duracionSegundos,
    };
  }

  async removeSong(playlistId: string, songId: string): Promise<void> {
    const playlist = await this.findById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }

    const cancionAEliminar = (playlist.canciones ?? []).find(
      (c) => (c.cancion_id as Types.ObjectId).toString() === songId,
    );
    if (!cancionAEliminar) {
      throw new NotFoundException('Canción no encontrada en la playlist');
    }

    const duracionARestar = cancionAEliminar.duracion || 0;

    const result = await this.collection.updateOne(
      { _id: new Types.ObjectId(playlistId) },
      {
        $pull: { canciones: { cancion_id: new Types.ObjectId(songId) } },
        $inc: {
          total_canciones: -1,
          duracion_total: -duracionARestar,
        },
        $set: { fecha_actualizacion: new Date() },
      } as Record<string, any>,
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('No se pudo eliminar la canción');
    }
  }

  async reorder(playlistId: string, nuevoOrden: string[]): Promise<PlaylistDoc> {
    if (!Array.isArray(nuevoOrden)) {
      throw new BadRequestException('Se requiere un array con el nuevo orden');
    }

    const playlist = await this.findById(playlistId);
    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada');
    }

    const cancionesMap: Record<string, any> = {};
    (playlist.canciones ?? []).forEach((c) => {
      cancionesMap[(c.cancion_id as Types.ObjectId).toString()] = c;
    });

    const cancionesReordenadas = nuevoOrden
      .filter((id) => cancionesMap[id])
      .map((id, index) => ({ ...cancionesMap[id], orden: index + 1 }));

    const updated = await this.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(playlistId) },
      {
        $set: {
          canciones: cancionesReordenadas,
          fecha_actualizacion: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException('Playlist no encontrada');
    }
    return updated;
  }

  async incrementPlays(playlistId: string): Promise<number> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new Types.ObjectId(playlistId) },
      { $inc: { reproducciones: 1 } },
      { returnDocument: 'after' },
    );
    if (!result) {
      throw new NotFoundException('Playlist no encontrada');
    }
    return Number(result.reproducciones ?? 0);
  }
}
