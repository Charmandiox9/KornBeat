import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Types } from 'mongoose';
import { FavoritesService } from './favorites.service';

@Controller('api/music')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  private ctx(req: Request) {
    return { protocol: req.protocol, host: req.get('host') ?? 'localhost' };
  }

  private assertIds(userId: string, songId?: string): void {
    if (
      !Types.ObjectId.isValid(userId) ||
      (songId !== undefined && !Types.ObjectId.isValid(songId))
    ) {
      throw new BadRequestException('ID de usuario o canción inválido');
    }
  }

  @Get('user/:userId/favorites')
  async getFavorites(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }
    const p = parseInt(page ?? '1', 10) || 1;
    const l = parseInt(limit ?? '20', 10) || 20;
    const s = sort ?? 'recent';
    return this.favoritesService.getFavorites(userId, p, l, s, this.ctx(req));
  }

  @Get('user/:userId/favorites/:songId/check')
  async checkFavorite(
    @Param('userId') userId: string,
    @Param('songId') songId: string,
  ) {
    this.assertIds(userId, songId);
    const { isFavorite, likeDate } = await this.favoritesService.isFavorite(
      userId,
      songId,
    );
    return { success: true, isFavorite, likeDate };
  }

  @Post('user/:userId/favorites/:songId')
  async addFavorite(
    @Param('userId') userId: string,
    @Param('songId') songId: string,
  ) {
    this.assertIds(userId, songId);
    const like = await this.favoritesService.addFavorite(userId, songId);
    return { success: true, message: 'Canción agregada a favoritos', like };
  }

  @Delete('user/:userId/favorites/:songId')
  async removeFavorite(
    @Param('userId') userId: string,
    @Param('songId') songId: string,
  ) {
    this.assertIds(userId, songId);
    await this.favoritesService.removeFavorite(userId, songId);
    return { success: true, message: 'Canción eliminada de favoritos' };
  }
}
