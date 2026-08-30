import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>('auth.redisHost');
        const port = config.get<number>('auth.redisPort');
        const password = config.get<string>('auth.redisPassword');

        const client = new Redis({
          host,
          port,
          password: password || undefined,
          db: 0,
          lazyConnect: false,
          maxRetriesPerRequest: 2,
        });

        client.on('connect', () =>
          // eslint-disable-next-line no-console
          console.log('🔄 Redis: Conectando...'),
        );
        client.on('ready', () =>
          // eslint-disable-next-line no-console
          console.log('✅ Redis: Conectado y listo'),
        );
        client.on('error', (err) =>
          // eslint-disable-next-line no-console
          console.error('❌ Redis Error:', err.message),
        );

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
