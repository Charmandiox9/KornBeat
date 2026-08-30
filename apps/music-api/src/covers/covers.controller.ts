import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { MinioService } from '../minio/minio.service';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

@Controller('api/music')
export class CoversController {
  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  @Get('covers/*coverPath')
  async serveCover(
    @Param('coverPath') coverPathParam?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ): Promise<void> {
    let coverPath = coverPathParam;
    if (!coverPath && req) {
      // Fallback: extraer del path (wildcards anónimos)
      const idx = req.path.indexOf('/api/music/covers/');
      coverPath = idx >= 0 ? req.path.slice(idx + '/api/music/covers/'.length) : '';
    }
    if (!coverPath) {
      throw new NotFoundException('Cover no encontrado');
    }

    if (!coverPath.startsWith('covers/')) {
      coverPath = `covers/${coverPath}`;
    }

    const res2 = res!;

    try {
      const dataStream = await this.minioService.getObject(coverPath);
      const ext = coverPath.split('.').pop()?.toLowerCase() ?? '';
      res2.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'image/jpeg');
      res2.setHeader('Cache-Control', 'public, max-age=86400');
      res2.setHeader('Access-Control-Allow-Origin', '*');
      dataStream.pipe(res2);
      dataStream.on('error', (err) => {
        console.error('❌ Error streaming cover:', err.message);
        if (!res2.headersSent) res2.status(500).end();
      });
      return;
    } catch (minioError) {
      // Fallback: sistema de archivos
      const uploadsDir = this.configService.get<string>('music.uploadsDir') ?? './uploads';
      const localPath = path.join(uploadsDir, coverPath);

      if (fs.existsSync(localPath)) {
        const ext = path.extname(localPath).toLowerCase().replace(/^\./, '');
        res2.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'image/jpeg');
        res2.setHeader('Cache-Control', 'public, max-age=86400');
        res2.setHeader('Access-Control-Allow-Origin', '*');
        fs.createReadStream(localPath).pipe(res2);
        return;
      }

      throw new NotFoundException('Cover no encontrado');
    }
  }
}
