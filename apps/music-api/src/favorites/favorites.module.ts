import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeCancion, LikeCancionSchema } from './like-cancion.schema';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [
    SongsModule,
    MongooseModule.forFeature([
      { name: LikeCancion.name, schema: LikeCancionSchema },
    ]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
