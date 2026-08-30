import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';
import { COUNTER_SYNC_EVERY, REDIS_KEYS } from '@kornbeat/shared';
import { SongsService } from '../songs/songs.service';

@Injectable()
export class CountersService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly songsService: SongsService,
  ) {}

  /**
   * Incrementa un contador en Redis y, cada COUNTER_SYNC_EVERY,
   * lo persiste en Mongo (misma lógica que el legacy app.js).
   */
  async incrementCounter(songId: string, type: 'plays' | 'likes' = 'plays'): Promise<number> {
    if (this.redis.status !== 'ready') return 0;
    try {
      const key = REDIS_KEYS.songCounter(songId, type);
      const count = await this.redis.incr(key);

      if (count % COUNTER_SYNC_EVERY === 0) {
        await this.syncCounterToMongo(songId, type, count);
      }

      return count;
    } catch (error) {
      console.error('Error al incrementar contador:', error);
      return 0;
    }
  }

  private async syncCounterToMongo(
    songId: string,
    type: 'plays' | 'likes',
    count: number,
  ): Promise<void> {
    try {
      const field = type === 'plays' ? 'playCount' : 'likes';
      await this.songsService.incrementField(songId, field, count);

      const key = REDIS_KEYS.songCounter(songId, type);
      await this.redis.set(key, '0');
    } catch (error) {
      console.error('Error al sincronizar contador:', error);
    }
  }

  /**
   * Sincroniza todos los contadores pendientes de Redis a Mongo
   * (endpoint admin /api/music/admin/sync-counters).
   */
  async syncAll(): Promise<number> {
    if (this.redis.status !== 'ready') return 0;
    const keys: string[] = await this.redis.keys('counter:song:*');
    let synced = 0;

    for (const key of keys) {
      const parts = key.split(':');
      const songId = parts[2];
      const type = parts[3] as 'plays' | 'likes';
      const raw = await this.redis.get(key);
      const count = parseInt(raw ?? '0', 10);

      if (count > 0) {
        await this.syncCounterToMongo(songId, type, count);
        synced += 1;
      }
    }

    return synced;
  }
}
