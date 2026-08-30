import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { CountersService } from './counters.service';
import {
  REDIS_KEYS,
  REDIS_TTL,
  REEL_HISTORY_MAX,
} from '@kornbeat/shared';

class PlayDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Contadores de reproducción/likes vía Redis (paridad de diseño con el
 * legacy app.js: el cliente notifica cada play y el contador se persiste
 * en Mongo por lotes). El frontend llama a estos endpoints al reproducir.
 */
@Controller('api/music')
export class CountersController {
  constructor(
    private readonly countersService: CountersService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Post('songs/:id/play')
  async play(
    @Param('id') id: string,
    @Body() body: PlayDto,
  ) {
    const count = await this.countersService.incrementCounter(id, 'plays');
    if (body?.userId) {
      await this.trackRecentSong(body.userId, id);
    }
    return { success: true, songId: id, type: 'plays', count };
  }

  @Post('songs/:id/like')
  async like(@Param('id') id: string) {
    const count = await this.countersService.incrementCounter(id, 'likes');
    return { success: true, songId: id, type: 'likes', count };
  }

  private async trackRecentSong(userId: string, songId: string): Promise<void> {
    if (this.redis.status !== 'ready') return;
    try {
      const key = REDIS_KEYS.userRecentSongs(userId);
      await this.redis.lpush(key, songId);
      await this.redis.ltrim(key, 0, REEL_HISTORY_MAX - 1);
      await this.redis.expire(key, REDIS_TTL.recentSongs);
    } catch (error) {
      console.error('Error registrando canción reciente:', error);
    }
  }
}
