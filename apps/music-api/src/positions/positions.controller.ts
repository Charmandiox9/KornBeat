import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';
import { ReelPosition } from '@kornbeat/shared';
import { PositionsService } from './positions.service';
import { SongsService } from '../songs/songs.service';
import { processSongCoverUrl } from '../common/utils/cover-url.helper';

@Controller('api/music')
export class PositionsController {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly songsService: SongsService,
  ) {}

  private ctx(req: Request) {
    return { protocol: req.protocol, host: req.get('host') ?? 'localhost' };
  }

  @Post('user/:userId/reel-position')
  @HttpCode(200)
  async savePosition(
    @Param('userId') userId: string,
    @Body()
    body: {
      songId: string;
      position: number;
      timestamp?: number;
      progress?: number;
      isPlaying?: boolean;
    },
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }
    if (!body.songId || body.position === undefined) {
      throw new BadRequestException('Se requiere songId y position');
    }

    if (Types.ObjectId.isValid(body.songId)) {
      const song = await this.songsService.findById(body.songId);
      if (!song) {
        throw new NotFoundException('Canción no encontrada');
      }
    }

    const reelPosition: ReelPosition = {
      songId: body.songId,
      position: parseInt(String(body.position), 10),
      timestamp: body.timestamp || Date.now(),
      progress: body.progress || 0,
      isPlaying: body.isPlaying !== undefined ? body.isPlaying : false,
    };

    const saved = await this.positionsService.saveUserReelPosition(
      userId,
      reelPosition,
    );
    if (!saved) {
      throw new ServiceUnavailableException('Cache no disponible');
    }

    await this.positionsService.addToReelHistory(userId, body.songId);

    return {
      success: true,
      message: 'Última posición guardada',
      position: reelPosition,
    };
  }

  @Get('user/:userId/reel-position')
  async getPosition(@Param('userId') userId: string, @Req() req: Request) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const position = await this.positionsService.getUserReelPosition(userId);

    if (!position) {
      return {
        success: true,
        hasPosition: false,
        position: null,
        message: 'No hay posición guardada para este usuario',
      };
    }

    let songDetails: unknown = null;
    if (position.songId && Types.ObjectId.isValid(position.songId)) {
      const song = await this.songsService.findById(position.songId);
      if (song) {
        songDetails = processSongCoverUrl(song.toObject(), this.ctx(req));
      }
    }

    return {
      success: true,
      hasPosition: true,
      position: { ...position, song: songDetails },
    };
  }

  @Delete('user/:userId/reel-position')
  async clearPosition(@Param('userId') userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const cleared = await this.positionsService.clearUserReelPosition(userId);
    if (!cleared) {
      throw new ServiceUnavailableException('Cache no disponible');
    }

    return { success: true, message: 'Última posición eliminada' };
  }

  @Get('user/:userId/reel-history')
  async getHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const history = await this.positionsService.getReelHistory(
      userId,
      parseInt(limit ?? '50', 10),
    );

    const songIds = history
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    let songs: Record<string, any>[] = [];
    if (songIds.length > 0) {
      const docs = await this.songsService.findByIds(songIds);
      songs = docs.map((s) => s.toObject());
    }

    const songsMap: Record<string, any> = {};
    songs.forEach((song) => {
      songsMap[song._id.toString()] = song;
    });

    const historyWithDetails = history
      .map((songId) => ({
        songId,
        song: songsMap[songId] ?? null,
      }))
      .filter((item) => item.song !== null);

    return {
      success: true,
      count: historyWithDetails.length,
      history: historyWithDetails,
    };
  }
}
