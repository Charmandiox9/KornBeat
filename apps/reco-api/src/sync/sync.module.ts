import { Module } from '@nestjs/common';
import { MongoModule } from './mongo.module';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
import { SyncGateway } from './sync.gateway';
import { RecommendationsModule } from '../recommendations/recommendations.module';

export { SyncService } from './sync.service';

@Module({
  imports: [MongoModule, RecommendationsModule],
  providers: [SyncService, SyncScheduler, SyncGateway],
  exports: [SyncService],
})
export class SyncModule {}
