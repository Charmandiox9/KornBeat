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
        const client = new Redis({
          host: config.get<string>('music.redisHost'),
          port: config.get<number>('music.redisPort'),
          password: config.get<string>('music.redisPassword') || undefined,
          db: 0,
          maxRetriesPerRequest: 2,
        });
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
