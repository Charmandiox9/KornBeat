import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { Long } from 'bson';
import { MONGO_COLLECTIONS, REDIS_KEYS } from '@kornbeat/shared';
import { parseBuffer } from 'music-metadata';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { MinioService } from '../minio/minio.service';
import { SongsService } from '../songs/songs.service';
import { toSongGql } from '../graphql/types/song.gql';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UploadSongDto } from './dto/upload-song.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export type ArtistUser = {
  id: string;
  email: string;
  name?: string;
  artistName?: string;
  country?: string | null;
};

/** Shape del archivo que entrega multer (memoria) a @UploadedFile(). */
export interface UploadedMp3 {
  fieldname: string;
  originalname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  destination: string;
  path: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ArtistService {
  private readonly logger = new Logger(ArtistService.name);

  constructor(
    private readonly songsService: SongsService,
    private readonly minioService: MinioService,
    @InjectConnection() private readonly connection: Connection,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private get albumesCollection() {
    return this.connection.collection(MONGO_COLLECTIONS.albumes);
  }

  private get artistasCollection() {
    return this.connection.collection(MONGO_COLLECTIONS.artistas);
  }

  /**
   * Obtiene (o crea perezosamente) el documento legacy 'artistas'
   * del usuario. La colección tiene jsonSchema (nombre_artistico y
   * country obligatorios).
   */
  private async getOrCreateArtistDoc(
    user: ArtistUser,
  ): Promise<Record<string, any>> {
    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException('Usuario inválido');
    }
    const userId = new Types.ObjectId(user.id);
    const doc = await this.artistasCollection.findOneAndUpdate(
      { usuario_id: userId },
      {
        $setOnInsert: {
          usuario_id: userId,
          nombre_artistico: user.artistName ?? user.name ?? user.email,
          country: (user.country ?? 'XX').toUpperCase().slice(0, 3),
          biografia: '',
          verificado: true,
          activo: true,
          oyentes_mensuales: 0,
          // El jsonSchema exige long (int64): un 0 JS se serializa como int32
          reproducciones_totales: Long.fromNumber(0),
          fecha_creacion: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    if (!doc) {
      throw new ForbiddenException('Cuenta de artista no disponible');
    }
    return doc as Record<string, any>;
  }

  private formatAlbum(
    doc: Record<string, any>,
    songs: { duration: number }[],
  ) {
    const totalDuration = songs.reduce(
      (acc, s) => acc + (Number(s.duration) || 0),
      0,
    );
    return {
      _id: doc._id.toString(),
      titulo: doc.titulo,
      year:
        doc.fecha_lanzamiento instanceof Date
          ? doc.fecha_lanzamiento.getFullYear()
          : doc.fecha_lanzamiento
            ? new Date(doc.fecha_lanzamiento).getFullYear()
            : null,
      descripcion: doc.descripcion ?? '',
      categorias: doc.categorias ?? [],
      fecha_lanzamiento:
        doc.fecha_lanzamiento instanceof Date
          ? doc.fecha_lanzamiento.toISOString()
          : String(doc.fecha_lanzamiento ?? ''),
      songs,
      totalDuration,
    };
  }

  async getMyMusic(user: ArtistUser) {
    const artist = await this.getOrCreateArtistDoc(user);
    const albumDocs = await this.albumesCollection
      .find({ artista_principal_id: artist._id })
      .sort({ fecha_lanzamiento: -1 })
      .toArray();

    const albums: ReturnType<typeof this.formatAlbum>[] = [];
    for (const albumDoc of albumDocs) {
      const songDocs = await this.songsService.findSongsToAlbum(albumDoc._id);
      const songs = songDocs
        .map((s) => toSongGql(s.toObject()))
        .filter((s): s is NonNullable<typeof s> => s !== null);
      albums.push(this.formatAlbum(albumDoc, songs));
    }

    const singlesDocs = await this.songsService.findSinglesByArtist(user.id);
    const singles = singlesDocs
      .map((s) => toSongGql(s.toObject()))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      success: true,
      user: { name: user.name ?? '', artistName: user.artistName ?? null },
      albums,
      singles,
    };
  }

  async createAlbum(user: ArtistUser, dto: CreateAlbumDto) {
    const artist = await this.getOrCreateArtistDoc(user);
    const releaseDate = dto.year ? new Date(dto.year, 0, 1) : new Date();
    const doc = {
      titulo: dto.titulo,
      artista_principal_id: artist._id,
      tipo_album: 'album',
      fecha_lanzamiento: releaseDate,
      portada_url: '',
      descripcion: dto.descripcion ?? '',
      categorias: [],
    };
    const res = await this.albumesCollection.insertOne(doc);
    const created = await this.albumesCollection.findOne({
      _id: res.insertedId,
    });
    return {
      success: true,
      message: `Álbum "${dto.titulo}" creado`,
      album: created ? this.formatAlbum(created, []) : null,
    };
  }

  async deleteAlbum(user: ArtistUser, albumId: string) {
    if (!Types.ObjectId.isValid(albumId)) {
      throw new BadRequestException('ID de álbum inválido');
    }
    const artist = await this.getOrCreateArtistDoc(user);
    const album = await this.albumesCollection.findOne({
      _id: new Types.ObjectId(albumId),
      artista_principal_id: artist._id,
    });
    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }

    const songs = await this.songsService.findSongsToAlbum(album._id);
    for (const song of songs) {
      await this.minioService.removeObject(song.fileName);
      await this.songsService.removeById(song._id.toString());
    }
    await this.albumesCollection.deleteOne({ _id: album._id });
    await this.invalidateSongsCache();

    this.logger.log(
      `Álbum eliminado: "${album.titulo}" (${songs.length} canciones) por ${user.id}`,
    );
    return {
      success: true,
      message: `Álbum "${album.titulo}" eliminado con ${songs.length} canciones`,
    };
  }

  async deleteSong(user: ArtistUser, songId: string) {
    if (!Types.ObjectId.isValid(songId)) {
      throw new BadRequestException('ID de canción inválido');
    }
    const song = await this.songsService.findById(songId);
    if (!song || song.artist_id !== user.id) {
      throw new NotFoundException('Canción no encontrada');
    }
    await this.minioService.removeObject(song.fileName);
    await this.songsService.removeById(songId);
    await this.invalidateSongsCache();

    this.logger.log(`Canción eliminada: "${song.title}" por ${user.id}`);
    return { success: true, message: `Canción "${song.title}" eliminada` };
  }

  async uploadSongToAlbum(
    file: UploadedMp3 | undefined,
    user: ArtistUser,
    albumId: string,
    meta: UploadSongDto,
  ) {
    const artist = await this.getOrCreateArtistDoc(user);
    if (!Types.ObjectId.isValid(albumId)) {
      throw new BadRequestException('ID de álbum inválido');
    }
    const album = await this.albumesCollection.findOne({
      _id: new Types.ObjectId(albumId),
      artista_principal_id: artist._id,
    });
    if (!album) {
      throw new NotFoundException('Álbum no encontrado');
    }
    return this.uploadSong(file, user, meta, album);
  }

  async uploadSingle(
    file: UploadedMp3 | undefined,
    user: ArtistUser,
    meta: UploadSongDto,
  ) {
    await this.getOrCreateArtistDoc(user);
    return this.uploadSong(file, user, meta, null);
  }

  private async uploadSong(
    file: UploadedMp3 | undefined,
    user: ArtistUser,
    meta: UploadSongDto,
    album: Record<string, any> | null,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Falta el archivo de audio');
    }
    const original = file.originalname ?? '';
    if (!original.toLowerCase().endsWith('.mp3')) {
      throw new BadRequestException('Solo se permiten archivos MP3');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('El archivo supera el límite de 50 MB');
    }

    let duration = 0;
    let metaTitle: string | null = null;
    let metaGenre: string | null = null;
    try {
      const md = await parseBuffer(file.buffer);
      duration = Math.round(md.format.duration ?? 0);
      metaTitle = md.common.title ?? null;
      metaGenre = md.common.genre?.[0] ?? null;
    } catch {
      this.logger.warn(`Sin metadatos MP3 en "${original}"`);
    }

    const baseName = original.replace(/\.mp3$/i, '');
    const title = meta.titulo?.trim() || metaTitle || baseName;
    const safeName = original.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const objectKey = `artists/${user.id}/${Date.now()}_${safeName}`;

    await this.minioService.putObject(objectKey, file.buffer, file.size);

    const song = await this.songsService.create({
      title,
      artist: user.artistName ?? user.name ?? user.email,
      album: album?.titulo ?? '',
      genre: meta.genero?.trim() || metaGenre || '',
      duration,
      fileName: objectKey,
      fileSize: file.size,
      artist_id: user.id,
      album_id: album?._id ?? null,
      playCount: 0,
      likes: 0,
    });

    await this.invalidateSongsCache();
    this.logger.log(`Subida: "${title}" -> ${objectKey} (${file.size} bytes)`);

    return {
      success: true,
      message: album
        ? `Canción "${title}" agregada al álbum "${album.titulo}"`
        : `Sencillo "${title}" publicado`,
      song: toSongGql(song.toObject()),
    };
  }

  private async invalidateSongsCache(): Promise<void> {
    if (this.redis.status === 'ready') {
      await this.redis.del(REDIS_KEYS.songsListCache()).catch(() => undefined);
    }
  }
}
