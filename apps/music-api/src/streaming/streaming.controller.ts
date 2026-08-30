import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { SongsService } from '../songs/songs.service';
import { MinioService } from '../minio/minio.service';

@Controller('api/music')
export class StreamingController {
  constructor(
    private readonly songsService: SongsService,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  @Get('songs/:id/stream')
  async stream(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de canción inválido');
    }

    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException('Canción no encontrada');
    }

    // El conteo de reproducciones lo notifica el cliente vía
    // POST /api/music/songs/:id/play (Redis + sync por lotes a Mongo).

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, Accept-Ranges, Content-Length',
    );

    let fileSize: number;
    let minioStatError: unknown = null;
    try {
      const stat = await this.minioService.statObject(song.fileName);
      fileSize = stat.size;
    } catch (err) {
      minioStatError = err;
      // Fallback: sistema de archivos
      const localPath = this.localMusicPath(song.fileName);
      if (localPath && fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        fileSize = stat.size;
        return this.serveFromDisk(localPath, fileSize, req, res);
      }
      throw new NotFoundException(
        'Archivo no encontrado en MinIO ni en sistema de archivos',
      );
    }

    const range = req.headers.range;

    if (range) {
      const parsed = this.parseRange(range, fileSize);
      if (!parsed) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const { start, end } = parsed;
      const chunkSize = end - start + 1;

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=0',
      });

      try {
        const dataStream = await this.minioService.getPartialObject(
          song.fileName,
          start,
          chunkSize,
        );
        dataStream.pipe(res);
        dataStream.on('error', (err) => {
          console.error('❌ Error en stream de MinIO:', err.message);
          if (!res.headersSent) res.status(500).end();
        });
      } catch (err) {
        console.error('❌ Error al acceder a MinIO:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error al reproducir canción',
          });
        }
      }
      return;
    }

    // Streaming completo
    res.status(200).set({
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=0',
    });

    try {
      const dataStream = await this.minioService.getObject(song.fileName);
      dataStream.pipe(res);
      dataStream.on('error', (err) => {
        console.error('❌ Error en stream de MinIO:', err.message);
        if (!res.headersSent) res.status(500).end();
      });
    } catch (err) {
      console.error('❌ Error al acceder a MinIO:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error al reproducir canción',
        });
      }
    }

    void minioStatError;
  }

  private localMusicPath(fileName: string): string | null {
    const uploadsDir = this.configService.get<string>('music.uploadsDir');
    if (!uploadsDir) return null;
    return path.join(uploadsDir, 'music', fileName);
  }

  private serveFromDisk(
    filePath: string,
    fileSize: number,
    req: Request,
    res: Response,
  ): void {
    const range = req.headers.range;

    if (range) {
      const parsed = this.parseRange(range, fileSize);
      if (!parsed) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const { start, end } = parsed;
      const chunkSize = end - start + 1;
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=0',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.status(200).set({
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  }

  private parseRange(
    range: string,
    fileSize: number,
  ): { start: number; end: number } | null {
    const parts = range.replace(/bytes=/, '').split('-');
    const startStr = parts[0];
    const endStr = parts[1];

    let start: number;
    let end: number;

    if (startStr === '' && endStr !== undefined) {
      // Suffix range: bytes=-N (últimos N bytes)
      const suffix = parseInt(endStr, 10);
      if (Number.isNaN(suffix) || suffix <= 0) return null;
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else {
      start = parseInt(startStr, 10);
      if (Number.isNaN(start) || start < 0 || start >= fileSize) return null;
      end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      if (Number.isNaN(end)) end = fileSize - 1;
      if (end >= fileSize) end = fileSize - 1;
      if (start > end) return null;
    }

    return { start, end };
  }
}
