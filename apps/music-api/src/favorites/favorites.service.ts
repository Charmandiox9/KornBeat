import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  LikeCancion,
  LikeCancionDocument,
} from './like-cancion.schema';
import { SongsService } from '../songs/songs.service';
import { CoverContext, processSongCoverUrl } from '../common/utils/cover-url.helper';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(LikeCancion.name)
    private readonly likeModel: Model<LikeCancionDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly songsService: SongsService,
  ) {}

  async getFavorites(
    userId: string,
    page: number,
    limit: number,
    sort: string,
    ctx: CoverContext,
  ) {
    const skip = (page - 1) * limit;

    const likesCount = await this.likeModel.countDocuments({
      usuario_id: new Types.ObjectId(userId),
    });

    if (likesCount === 0) {
      return {
        success: true as const,
        count: 0,
        total: 0,
        page,
        limit,
        totalPages: 0,
        favorites: [],
      };
    }

    const sortOption: { fecha_like: 1 | -1 } =
      sort === 'oldest' ? { fecha_like: 1 } : { fecha_like: -1 };
    const userLikes = await this.likeModel
      .find({ usuario_id: new Types.ObjectId(userId) })
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const songIds = userLikes.map((like) => like.cancion_id);

    const [songsFromSongs, songsFromCanciones] = await Promise.all([
      this.songsService.findByIds(songIds).then((songs) =>
        songs.map((s) => s.toObject()),
      ),
      this.songsService.findCancionesByIds(songIds),
    ]);

    const songsMap: Record<string, any> = {};

    songsFromSongs.forEach((song: any) => {
      songsMap[song._id.toString()] = {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        duration: song.duration,
        genre: song.genre || '',
        coverUrl: song.coverUrl,
        fileName: song.fileName,
        playCount: song.playCount || 0,
        likes: song.likes || 0,
        source: 'songs',
      };
    });

    songsFromCanciones.forEach((cancion: any) => {
      songsMap[cancion._id.toString()] = {
        _id: cancion._id,
        title: cancion.titulo,
        artist: cancion.artistas?.[0]?.nombre || 'Artista desconocido',
        album: cancion.album_info?.titulo || '',
        duration: cancion.duracion_segundos,
        genre: cancion.categorias?.[0] || '',
        coverUrl: cancion.album_info?.portada_url || cancion.portada_url,
        fileName: cancion.archivo_url || cancion.fileName,
        playCount: Number(cancion.reproducciones) || 0,
        likes: Number(cancion.likes) || 0,
        source: 'canciones',
      };
    });

    const favorites = userLikes
      .map((like) => {
        const songId = like.cancion_id.toString();
        const song = songsMap[songId];
        if (!song) return null;
        return {
          _id: like._id,
          usuario_id: like.usuario_id,
          cancion_id: like.cancion_id,
          fecha_like: like.fecha_like,
          song,
        };
      })
      .filter((fav) => fav !== null);

    const favoritesWithUrls = favorites.map((fav: any) => {
      const song = { ...fav.song };

      if (song.coverUrl) {
        const coverPath = song.coverUrl as string;
        if (!coverPath.startsWith('http')) {
          const cleanPath = coverPath
            .replace(/^\/uploads\//, '')
            .replace(/^covers\//, '');
          song.coverUrl = `${ctx.protocol}://${ctx.host}/api/music/covers/${cleanPath}`;
        }
      }

      if (song.fileName) {
        song.streamUrl = `${ctx.protocol}://${ctx.host}/api/music/songs/${fav.cancion_id}/stream`;
      }

      return { ...fav, song };
    });

    return {
      success: true as const,
      count: favoritesWithUrls.length,
      total: likesCount,
      page,
      limit,
      totalPages: Math.ceil(likesCount / limit),
      favorites: favoritesWithUrls,
    };
  }

  async addFavorite(userId: string, songId: string): Promise<LikeCancionDocument> {
    const song = await this.songsService.findById(songId);
    if (!song) {
      throw new NotFoundException('Canción no encontrada');
    }

    try {
      const like = await this.likeModel.findOneAndUpdate(
        {
          usuario_id: new Types.ObjectId(userId),
          cancion_id: new Types.ObjectId(songId),
        },
        {
          usuario_id: new Types.ObjectId(userId),
          cancion_id: new Types.ObjectId(songId),
          fecha_like: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      await this.songsService.incrementField(songId, 'likes', 1);
      return like;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('La canción ya está en favoritos');
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, songId: string): Promise<void> {
    const result = await this.likeModel.findOneAndDelete({
      usuario_id: new Types.ObjectId(userId),
      cancion_id: new Types.ObjectId(songId),
    });

    if (!result) {
      throw new NotFoundException('La canción no está en favoritos');
    }

    await this.songsService.incrementField(songId, 'likes', -1);
  }

  async isFavorite(
    userId: string,
    songId: string,
  ): Promise<{ isFavorite: boolean; likeDate: Date | null }> {
    const like = await this.likeModel.findOne({
      usuario_id: new Types.ObjectId(userId),
      cancion_id: new Types.ObjectId(songId),
    });
    return {
      isFavorite: !!like,
      likeDate: like ? like.fecha_like : null,
    };
  }
}
