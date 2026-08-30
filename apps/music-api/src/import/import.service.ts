import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseFile } from 'music-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { SongsService } from '../songs/songs.service';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly songsService: SongsService,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  get musicDir(): string {
    const uploadsDir = this.configService.get<string>('music.uploadsDir') ?? './uploads';
    return path.join(uploadsDir, 'music');
  }

  async importMusic(): Promise<void> {
    try {
      await fs.promises.access(this.musicDir);
    } catch {
      this.logger.warn('La carpeta uploads/music no existe.');
      return;
    }

    const files = await fs.promises.readdir(this.musicDir);
    const mp3Files = files.filter((f) => f.toLowerCase().endsWith('.mp3'));
    this.logger.log(`📁 Encontrados ${mp3Files.length} archivos MP3`);

    for (const file of mp3Files) {
      const filePath = path.join(this.musicDir, file);

      const exists = await this.songsService.findByFileName(file);
      if (exists) {
        this.logger.log(`⏭️  Ya existe: ${file}`);
        continue;
      }

      try {
        const minioExists = await this.minioService.objectExists(file);
        if (!minioExists) {
          await this.minioService.fPutObject(file, filePath);
          this.logger.log(`☁️  Subido a MinIO: ${file}`);
        }
      } catch (err) {
        this.logger.error(`❌ Error subiendo a MinIO: ${file}`, (err as Error).message);
        continue;
      }

      let title = file.replace(/\.[^/.]+$/, '');
      let artist = 'Desconocido';
      let album = '';
      let genre = '';
      let duration = 0;

      try {
        const metadata = await parseFile(filePath);
        title = metadata.common.title || title;
        artist = metadata.common.artist || artist;
        album = metadata.common.album || '';
        genre = metadata.common.genre?.[0] || '';
        duration = Math.round(metadata.format.duration || 0);
      } catch (metaErr) {
        this.logger.warn(`⚠️  No se pudieron leer metadatos de: ${file}`);
      }

      const fileStats = await fs.promises.stat(filePath);

      try {
        await this.songsService.create({
          title,
          artist,
          album,
          genre,
          duration,
          fileName: file,
          fileSize: fileStats.size,
          playCount: 0,
        });
        this.logger.log(`✅ Registrada: ${title} - ${artist}`);
      } catch (err) {
        this.logger.error(`❌ Error registrando ${file}`, (err as Error).message);
      }
    }

    this.logger.log('🎉 Importación completada');
  }
}
