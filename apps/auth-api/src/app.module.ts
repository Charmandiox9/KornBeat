import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import authConfig from './config/env.config';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AuthModule } from './auth/auth.module';
import { ArtistRequestsModule } from './artist-requests/artist-requests.module';
import { HealthController } from './health/health.controller';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    RedisModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('auth.mongoUri'),
      }),
    }),
    UsersModule,
    SessionsModule,
    AuthModule,
    ArtistRequestsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GlobalRateLimitMiddleware).forRoutes('*');
  }
}
