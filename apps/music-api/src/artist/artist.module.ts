import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ArtistService } from './artist.service';
import { ArtistController } from './artist.controller';
import { MusicJwtAuthGuard } from './auth/jwt-auth.guard';
import { ArtistGuard } from './auth/artist.guard';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [
    SongsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret:
          config.get<string>('music.jwtSecret') ?? 'change_me_in_production',
      }),
    }),
  ],
  controllers: [ArtistController],
  providers: [ArtistService, MusicJwtAuthGuard, ArtistGuard],
  exports: [ArtistService],
})
export class ArtistModule {}
