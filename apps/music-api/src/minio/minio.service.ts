import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { MINIO_CLIENT } from './minio.constants';

@Injectable()
export class MinioService implements OnModuleInit, OnModuleDestroy {
  private client: Minio.Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    const minio = config.get('music.minio') as {
      endpoint: string;
      port: number;
      useSsl: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
    };
    this.bucket = minio.bucket;
    this.client = new Minio.Client({
      endPoint: minio.endpoint,
      port: minio.port,
      useSSL: minio.useSsl,
      accessKey: minio.accessKey,
      secretKey: minio.secretKey,
    });
  }

  getClient(): Minio.Client {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client
        .bucketExists(this.bucket)
        .catch(() => false);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        // eslint-disable-next-line no-console
        console.log(`✅ Bucket creado: ${this.bucket}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('❌ Error inicializando MinIO:', (err as Error).message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    // El cliente MinIO no expone close(); nada que hacer.
  }

  statObject(objectName: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, objectName);
  }

  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }

  getObject(objectName: string): Promise<NodeJS.ReadableStream> {
    return this.client.getObject(this.bucket, objectName);
  }

  getPartialObject(
    objectName: string,
    offset: number,
    length?: number,
  ): Promise<NodeJS.ReadableStream> {
    return this.client.getPartialObject(this.bucket, objectName, offset, length ?? 0);
  }

  fPutObject(
    objectName: string,
    filePath: string,
  ): Promise<unknown> {
    return this.client.fPutObject(this.bucket, objectName, filePath);
  }

  putObject(
    objectName: string,
    data: Buffer | Readable,
    size: number,
  ): Promise<unknown> {
    return this.client.putObject(this.bucket, objectName, data, size) as Promise<unknown>;
  }

  async removeObject(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'NoSuchKey') {
        // eslint-disable-next-line no-console
        console.error(
          `❌ Error eliminando objeto ${objectName}: ${(err as Error).message}`,
        );
      }
    }
  }

  listObjects(): Promise<{ name: string; size: number }[]> {
    return new Promise((resolve, reject) => {
      const files: { name: string; size: number }[] = [];
      const stream = this.client.listObjects(this.bucket, '', true);
      stream
        .on('data', (obj: { name: string; size: number }) =>
          files.push({ name: obj.name, size: obj.size }),
        )
        .on('error', reject)
        .on('end', () => resolve(files));
    });
  }
}
