import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '@kornbeat/shared';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { SongsService } from './songs.service';
import {
  processSongCoverUrl,
  processSongsCoverUrls,
} from '../common/utils/cover-url.helper';
import { CoverContext } from '../common/utils/cover-url.helper';

@Controller('api/music')
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private coverCtx(req: Request): CoverContext {
    return { protocol: req.protocol, host: req.get('host') ?? 'localhost' };
  }

  private assertObjectId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${label} inválido`);
    }
  }

  @Get('songs')
  async getAllSongs(@Req() req: Request) {
    // Caché de la lista cruda (las URLs de portada se resuelven por request)
    const cacheKey = REDIS_KEYS.songsListCache();
    let raw: Record<string, any>[] | null = null;
    if (this.redis.status === 'ready') {
      const hit = await this.redis.get(cacheKey);
      if (hit) {
        try {
          raw = JSON.parse(hit);
        } catch {
          raw = null;
        }
      }
    }
    if (!raw) {
      raw = (await this.songsService.findSortedByCreated()).map((s) =>
        s.toObject(),
      );
      if (this.redis.status === 'ready') {
        await this.redis
          .set(cacheKey, JSON.stringify(raw), 'EX', REDIS_TTL.queryCache)
          .catch(() => undefined);
      }
    }
    const songsWithCovers = processSongsCoverUrls(raw, this.coverCtx(req));
    return {
      success: true,
      data: songsWithCovers,
      count: songsWithCovers.length,
    };
  }

  // ===== Búsqueda =====

  @Get('search/artist/:artistName')
  async searchArtist(@Param('artistName') artistName: string, @Req() req: Request) {
    const songs = await this.songsService.searchByArtist(artistName);
    const withCovers = processSongsCoverUrls(
      songs.map((s) => s.toObject()),
      this.coverCtx(req),
    );
    return {
      success: true,
      data: withCovers,
      searchType: 'artist',
      query: artistName,
      count: withCovers.length,
    };
  }

  @Get('search/song/:songTitle')
  async searchSong(@Param('songTitle') songTitle: string, @Req() req: Request) {
    const songs = await this.songsService.searchByTitle(songTitle);
    const withCovers = processSongsCoverUrls(
      songs.map((s) => s.toObject()),
      this.coverCtx(req),
    );
    return {
      success: true,
      data: withCovers,
      searchType: 'song',
      query: songTitle,
      count: withCovers.length,
    };
  }

  @Get('search/category/:category')
  async searchCategory(@Param('category') category: string, @Req() req: Request) {
    const songs = await this.songsService.searchByCategory(category);
    const withCovers = processSongsCoverUrls(
      songs.map((s) => s.toObject()),
      this.coverCtx(req),
    );
    return {
      success: true,
      data: withCovers,
      searchType: 'category',
      query: category,
      count: withCovers.length,
    };
  }

  @Get('search/:query')
  async searchGeneral(@Param('query') query: string, @Req() req: Request) {
    const songs = await this.songsService.searchGeneral(query);
    const withCovers = processSongsCoverUrls(
      songs.map((s) => s.toObject()),
      this.coverCtx(req),
    );
    const q = query.toLowerCase();
    const results = {
      byTitle: withCovers.filter((s) => s.title.toLowerCase().includes(q)),
      byArtist: withCovers.filter(
        (s) =>
          s.artist.toLowerCase().includes(q) ||
          (s.composers ?? []).some((c: string) => c.toLowerCase().includes(q)),
      ),
      byAlbum: withCovers.filter(
        (s) => s.album && s.album.toLowerCase().includes(q),
      ),
      byGenre: withCovers.filter(
        (s) => s.genre && s.genre.toLowerCase().includes(q),
      ),
    };
    return {
      success: true,
      data: withCovers,
      results,
      searchType: 'general',
      query,
      count: withCovers.length,
    };
  }

  // ===== Detalle =====

  @Get('songs/:id')
  async getSong(@Param('id') id: string, @Req() req: Request) {
    this.assertObjectId(id, 'ID de canción');
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException('Canción no encontrada');
    }
    const songWithCover = processSongCoverUrl(song.toObject(), this.coverCtx(req));
    return { success: true, data: songWithCover };
  }

  @Get('songs/:id/cover-url')
  async getCoverUrl(@Param('id') id: string, @Req() req: Request) {
    this.assertObjectId(id, 'ID');
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException('Canción no encontrada');
    }
    const coverUrl = song.coverUrl || (song as any).portada_url;
    const fullCoverUrl = coverUrl
      ? `${req.protocol}://${req.get('host')}/api/music/covers/${String(coverUrl).replace(/^covers\//, '')}`
      : null;
    return { success: true, coverUrl: fullCoverUrl, hasCover: !!coverUrl };
  }
}
