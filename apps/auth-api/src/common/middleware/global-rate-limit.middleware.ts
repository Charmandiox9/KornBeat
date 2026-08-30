import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import Redis from 'ioredis';
import { RATE_LIMITS } from '@kornbeat/shared';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const { limit, ttlMs } = RATE_LIMITS.global;

    this.redis
      .incr(`rate_limit:${ip}`)
      .then((current) => {
        if (current === 1) {
          return this.redis.expire(`rate_limit:${ip}`, Math.ceil(ttlMs / 1000));
        }
        return undefined;
      })
      .then(() => {
        next();
      })
      .catch(() => next());
  }
}
