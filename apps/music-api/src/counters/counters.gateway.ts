import {
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const BROADCAST_INTERVAL_MS = 15_000;

/**
 * Gateway WS (namespace 'counters', path /socket.io/music).
 *
 * Difunde cada 15s los deltas pendientes de contadores en Redis
 * (counter:song:<id>:plays|likes) antes de su persistencia en Mongo,
 * para que el cliente muestre reproducciones/likes "en vivo".
 */
@WebSocketGateway({
  namespace: 'counters',
  path: '/socket.io/music',
  cors: { origin: true, credentials: true },
})
export class CountersGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(CountersGateway.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.broadcastPending().catch((err) =>
        this.logger.error(`Error difundiendo contadores: ${err.message}`),
      );
    }, BROADCAST_INTERVAL_MS);
    this.broadcastPending().catch(() => undefined);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async broadcastPending(): Promise<void> {
    if (this.redis.status !== 'ready') return;

    const keys: string[] = await this.redis.keys('counter:song:*');
    if (keys.length === 0) return;

    const values = await Promise.all(keys.map((k) => this.redis.get(k)));
    const pending: Record<string, { plays: number; likes: number }> = {};

    keys.forEach((key, i) => {
      const value = Number(values[i] ?? 0);
      if (value <= 0) return;
      const parts = key.split(':'); // counter:song:<songId>:<type>
      const songId = parts[2];
      const type = parts[3];
      if (type !== 'plays' && type !== 'likes') return;
      pending[songId] ??= { plays: 0, likes: 0 };
      pending[songId][type] = value;
    });

    if (Object.keys(pending).length === 0) return;
    this.server.emit('counters:pending', { timestamp: Date.now(), pending });
  }
}
