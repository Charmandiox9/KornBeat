import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Song, SongSchema } from './song.schema';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { StreamingController } from '../streaming/streaming.controller';
import { CoversController } from '../covers/covers.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Song.name, schema: SongSchema }])],
  controllers: [SongsController, StreamingController, CoversController],
  providers: [SongsService],
  exports: [SongsService, MongooseModule],
})
export class SongsModule {}
