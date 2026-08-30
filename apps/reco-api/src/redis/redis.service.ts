import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get isAvailable(): boolean {
    return this.client.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async setEx(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttl);
    } catch (error) {
      console.error('Error guardando caché:', error);
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      const keys: string[] = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (error) {
      console.error('Error eliminando caché:', error);
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit().catch(() => undefined);
    }
  }
}
