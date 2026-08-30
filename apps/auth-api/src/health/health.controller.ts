import { Controller, Get } from '@nestjs/common';
import mongoose from 'mongoose';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        redis: this.redisService.isAvailable ? 'connected' : 'disconnected',
      },
    };
  }
}
