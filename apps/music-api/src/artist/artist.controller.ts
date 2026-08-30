import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  ArtistAuthRequest,
  MusicJwtAuthGuard,
} from './auth/jwt-auth.guard';
import { ArtistGuard } from './auth/artist.guard';
import { ArtistService, UploadedMp3 } from './artist.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UploadSongDto } from './dto/upload-song.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@ApiTags('artist')
@ApiBearerAuth()
@Controller('api/music/artist')
@UseGuards(MusicJwtAuthGuard, ArtistGuard)
export class ArtistController {
  constructor(private readonly artistService: ArtistService) {}

  @Get('me')
  me(@Req() req: ArtistAuthRequest) {
    return this.artistService.getMyMusic(req.user!);
  }

  @Post('albums')
  createAlbum(@Req() req: ArtistAuthRequest, @Body() dto: CreateAlbumDto) {
    return this.artistService.createAlbum(req.user!, dto);
  }

  @Delete('albums/:id')
  deleteAlbum(@Req() req: ArtistAuthRequest, @Param('id') id: string) {
    return this.artistService.deleteAlbum(req.user!, id);
  }

  @Post('albums/:id/songs')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  addSongToAlbum(
    @Req() req: ArtistAuthRequest,
    @Param('id') id: string,
    @UploadedFile() file: UploadedMp3,
    @Body() dto: UploadSongDto,
  ) {
    return this.artistService.uploadSongToAlbum(file, req.user!, id, dto);
  }

  @Post('singles')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  uploadSingle(
    @Req() req: ArtistAuthRequest,
    @UploadedFile() file: UploadedMp3,
    @Body() dto: UploadSongDto,
  ) {
    return this.artistService.uploadSingle(file, req.user!, dto);
  }

  @Delete('songs/:id')
  deleteSong(@Req() req: ArtistAuthRequest, @Param('id') id: string) {
    return this.artistService.deleteSong(req.user!, id);
  }
}
