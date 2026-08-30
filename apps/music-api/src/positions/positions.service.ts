import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL, REEL_HISTORY_MAX } from '@kornbeat/shared';
import { ReelPosition } from '@kornbeat/shared';

@Injectable()
export class PositionsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  get available(): boolean {
    return this.redis.status === 'ready';
  }

  async saveUserReelPosition(
    userId: string,
    reelPosition: ReelPosition,
  ): Promise<boolean> {
    if (!this.available) return false;
    try {
      const key = REDIS_KEYS.userReelPosition(userId);
      const data = { ...reelPosition, lastUpdated: Date.now() };
      await this.redis.set(
        key,
        REDIS_TTL.reelPosition,
        'EX',
        JSON.stringify(data),
      );
      return true;
    } catch (error) {
      console.error('Error al guardar última posición:', error);
      return false;
    }
  }

  async getUserReelPosition(
    userId: string,
  ): Promise<(ReelPosition & { lastUpdated?: number }) | null> {
    if (!this.available) return null;
    try {
      const key = REDIS_KEYS.userReelPosition(userId);
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Error al obtener última posición:', error);
      return null;
    }
  }

  async clearUserReelPosition(userId: string): Promise<boolean> {
    if (!this.available) return false;
    try {
      await this.redis.del(REDIS_KEYS.userReelPosition(userId));
      return true;
    } catch (error) {
      console.error('Error al eliminar última posición:', error);
      return false;
    }
  }

  async addToReelHistory(userId: string, songId: string): Promise<boolean> {
    if (!this.available) return false;
    try {
      const key = REDIS_KEYS.userReelHistory(userId);
      await this.redis.lpush(key, songId);
      await this.redis.ltrim(key, 0, REEL_HISTORY_MAX - 1);
      await this.redis.expire(key, REDIS_TTL.reelHistory);
      return true;
    } catch (error) {
      console.error('Error al agregar a historial de reproducción:', error);
      return false;
    }
  }

  async getReelHistory(userId: string, limit = 50): Promise<string[]> {
    if (!this.available) return [];
    try {
      const key = REDIS_KEYS.userReelHistory(userId);
      return this.redis.lrange(key, 0, limit - 1);
    } catch (error) {
      console.error('Error al obtener historial de reproducción:', error);
      return [];
    }
  }
}
