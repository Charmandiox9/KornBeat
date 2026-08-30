import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PlaylistsService } from './playlists.service';

function assertValidObjectId(id: string, message: string): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(message);
  }
}

@Controller('api/music')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get('user/:userId/playlists')
  async getUserPlaylists(@Param('userId') userId: string) {
    assertValidObjectId(userId, 'ID de usuario inválido');
    const playlists = await this.playlistsService.findByUser(userId);
    return { success: true, count: playlists.length, playlists };
  }

  @Get('playlists/:playlistId')
  async getPlaylist(@Param('playlistId') playlistId: string) {
    assertValidObjectId(playlistId, 'ID de playlist inválido');
    const playlist = await this.playlistsService.findByIdWithSongs(playlistId);
    return { success: true, playlist };
  }

  @Post('user/:userId/playlists')
  async createPlaylist(
    @Param('userId') userId: string,
    @Body()
    body: {
      titulo: string;
      descripcion?: string;
      es_privada?: boolean;
      es_colaborativa?: boolean;
    },
  ) {
    assertValidObjectId(userId, 'ID de usuario inválido');
    const playlist = await this.playlistsService.create(userId, body);
    return {
      success: true,
      message: 'Playlist creada con éxito',
      playlist,
    };
  }

  @Put('playlists/:playlistId')
  async updatePlaylist(
    @Param('playlistId') playlistId: string,
    @Body()
    body: {
      titulo?: string;
      descripcion?: string;
      es_privada?: boolean;
      es_colaborativa?: boolean;
    },
  ) {
    assertValidObjectId(playlistId, 'ID de playlist inválido');
    const playlist = await this.playlistsService.update(playlistId, body);
    return {
      success: true,
      message: 'Playlist actualizada exitosamente',
      playlist,
    };
  }

  @Delete('playlists/:playlistId')
  async deletePlaylist(@Param('playlistId') playlistId: string) {
    assertValidObjectId(playlistId, 'ID de playlist inválido');
    await this.playlistsService.remove(playlistId);
    return { success: true, message: 'Playlist eliminada exitosamente' };
  }

  @Post('playlists/:playlistId/songs/:songId')
  @HttpCode(200)
  async addSongToPlaylist(
    @Param('playlistId') playlistId: string,
    @Param('songId') songId: string,
    @Body() body: { userId: string },
  ) {
    if (!Types.ObjectId.isValid(playlistId) || !Types.ObjectId.isValid(songId)) {
      throw new BadRequestException('IDs inválidos');
    }
    const playlist = await this.playlistsService.addSong(
      playlistId,
      songId,
      body.userId,
    );
    return {
      success: true,
      message: 'Canción agregada a la playlist',
      playlist,
    };
  }

  @Delete('playlists/:playlistId/songs/:songId')
  async removeSongFromPlaylist(
    @Param('playlistId') playlistId: string,
    @Param('songId') songId: string,
  ) {
    if (!Types.ObjectId.isValid(playlistId) || !Types.ObjectId.isValid(songId)) {
      throw new BadRequestException('IDs inválidos');
    }
    await this.playlistsService.removeSong(playlistId, songId);
    return { success: true, message: 'Canción eliminada de la playlist' };
  }

  @Put('playlists/:playlistId/reorder')
  async reorderPlaylist(
    @Param('playlistId') playlistId: string,
    @Body() body: { nuevoOrden: string[] },
  ) {
    assertValidObjectId(playlistId, 'ID de playlist inválido');
    const playlist = await this.playlistsService.reorder(
      playlistId,
      body.nuevoOrden ?? [],
    );
    return {
      success: true,
      message: 'Playlist reordenada exitosamente',
      playlist,
    };
  }

  @Post('playlists/:playlistId/play')
  @HttpCode(200)
  async playPlaylist(@Param('playlistId') playlistId: string) {
    assertValidObjectId(playlistId, 'ID de playlist inválido');
    const reproducciones = await this.playlistsService.incrementPlays(playlistId);
    return { success: true, reproducciones };
  }
}
