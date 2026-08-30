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
          host: config.get<string>('reco.redisHost'),
          port: config.get<number>('reco.redisPort'),
          password: config.get<string>('reco.redisPassword') || undefined,
          maxRetriesPerRequest: 2,
        });
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
