import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import recoConfig from './config/env.config';
import { Neo4jModule } from './neo4j/neo4j.module';
import { RedisModule } from './redis/redis.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { GqlModule } from './graphql/graphql.module';
import { SyncModule } from './sync/sync.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [recoConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    Neo4jModule,
    RedisModule,
    RecommendationsModule,
    GqlModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
