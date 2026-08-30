import { Controller, Get } from '@nestjs/common';
import mongoose from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { MinioService } from '../minio/minio.service';

@Controller()
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        mongodb:
          mongoose.connection.readyState === 1
            ? 'connected'
            : 'disconnected',
        redis: this.redisService.isAvailable ? 'connected' : 'disconnected',
        minio: 'initialized',
      },
    };
  }
}
