import {
  Module,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import musicConfig from './config/env.config';
import { RedisModule } from './redis/redis.module';
import { MinioModule } from './minio/minio.module';
import { SongsModule } from './songs/songs.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PositionsModule } from './positions/positions.module';
import { CountersModule } from './counters/counters.module';
import { GqlModule } from './graphql/graphql.module';
import { ArtistModule } from './artist/artist.module';
import { ImportModule, ImportService } from './import/import.module';
import { HealthController } from './health/health.controller';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [musicConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('music.mongoUri'),
      }),
    }),
    RedisModule,
    MinioModule,
    SongsModule,
    PlaylistsModule,
    FavoritesModule,
    PositionsModule,
    CountersModule,
    GqlModule,
    ArtistModule,
    ImportModule,
  ],
  controllers: [HealthController, AdminController],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly importService: ImportService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Importación automática de música al arrancar (paridad legacy)
    await this.importService.importMusic().catch((err: Error) => {
      console.error('❌ Error en importación automática:', err.message);
    });
  }
}
