import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { SongsModule } from '../songs/songs.module';

export { ImportService } from './import.service';

@Module({
  imports: [SongsModule],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
