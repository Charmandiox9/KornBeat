import { Module } from '@nestjs/common';
import { CountersService } from './counters.service';
import { CountersGateway } from './counters.gateway';
import { CountersController } from './counters.controller';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [SongsModule],
  controllers: [CountersController],
  providers: [CountersService, CountersGateway],
  exports: [CountersService],
})
export class CountersModule {}
