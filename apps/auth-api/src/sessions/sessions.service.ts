import { Inject, Injectable } from '@nestjs/common';
import { User } from '@kornbeat/shared';
import { RedisService } from '../redis/redis.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '@kornbeat/shared';

@Injectable()
export class SessionsService {
  constructor(
    private readonly redis: RedisService,
    @Inject(REDIS_CLIENT) private readonly client: Redis,
  ) {}

  // ============= CACHE DE USUARIOS =============

  async cacheUser(userId: string, userData: User): Promise<void> {
    if (!this.redis.isAvailable) return;
    await this.client
      .set(
        REDIS_KEYS.userCache(userId),
        JSON.stringify(userData),
        'EX',
        REDIS_TTL.userCache,
      )
      .catch((err) => console.error('Error al cachear usuario:', err));
  }

  async getCachedUser(userId: string): Promise<User | null> {
    if (!this.redis.isAvailable) return null;
    try {
      const cached = await this.client.get(REDIS_KEYS.userCache(userId));
      return cached ? (JSON.parse(cached) as User) : null;
    } catch (error) {
      console.error('Error al obtener usuario cacheado:', error);
      return null;
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.redis.isAvailable) return;
    await this.client.del(REDIS_KEYS.userCache(userId)).catch((err) =>
      console.error('Error al invalidar cache de usuario:', err),
    );
  }

  // ============= SESIONES =============

  async createSession(sessionId: string, userId: string, userData: User): Promise<void> {
    if (!this.redis.isAvailable) return;
    try {
      const sessionKey = REDIS_KEYS.session(sessionId);
      const userSessionsKey = REDIS_KEYS.userSessions(userId);
      const now = Date.now().toString();

      await this.client.hset(sessionKey, {
        user_id: userId,
        email: userData.email,
        name: userData.name,
        role: userData.is_premium ? 'premium' : 'free',
        created_at: now,
        last_activity: now,
      });
      await this.client.expire(sessionKey, REDIS_TTL.session);

      await this.client.sadd(userSessionsKey, sessionId);
      await this.client.expire(userSessionsKey, REDIS_TTL.session);
    } catch (error) {
      console.error('Error al crear sesión:', error);
    }
  }

  async getSession(sessionId: string): Promise<Record<string, string> | null> {
    if (!this.redis.isAvailable) return null;
    try {
      const sessionKey = REDIS_KEYS.session(sessionId);
      const sessionData = await this.client.hgetall(sessionKey);

      if (Object.keys(sessionData).length === 0) return null;

      await this.client.hset(sessionKey, 'last_activity', Date.now().toString());
      await this.client.expire(sessionKey, REDIS_TTL.session);

      return sessionData;
    } catch (error) {
      console.error('Error al obtener sesión:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    if (!this.redis.isAvailable) return;
    try {
      const sessionKey = REDIS_KEYS.session(sessionId);
      const userSessionsKey = REDIS_KEYS.userSessions(userId);
      await this.client.del(sessionKey);
      await this.client.srem(userSessionsKey, sessionId);
    } catch (error) {
      console.error('Error al eliminar sesión:', error);
    }
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    if (!this.redis.isAvailable) return;
    try {
      const userSessionsKey = REDIS_KEYS.userSessions(userId);
      const sessions: string[] = await this.client.smembers(userSessionsKey);
      if (sessions.length > 0) {
        await this.client.del(
          ...sessions.map((s: string) => REDIS_KEYS.session(s)),
        );
      }
      await this.client.del(userSessionsKey);
    } catch (error) {
      console.error('Error al eliminar todas las sesiones:', error);
    }
  }

  // ============= REFRESH TOKENS =============

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    if (!this.redis.isAvailable) return;
    try {
      await this.client.set(
        REDIS_KEYS.refreshToken(refreshToken),
        userId,
        'EX',
        REDIS_TTL.refreshToken,
      );
    } catch (error) {
      console.error('Error al guardar refresh token:', error);
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    if (!this.redis.isAvailable) return null;
    try {
      return await this.client.get(REDIS_KEYS.refreshToken(refreshToken));
    } catch (error) {
      console.error('Error al validar refresh token:', error);
      return null;
    }
  }

  async deleteRefreshToken(refreshToken: string): Promise<void> {
    if (!this.redis.isAvailable) return;
    try {
      await this.client.del(REDIS_KEYS.refreshToken(refreshToken));
    } catch (error) {
      console.error('Error al eliminar refresh token:', error);
    }
  }
}
