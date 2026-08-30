import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtistRequest, ArtistRequestSchema } from '../users/artist-request.schema';
import { ArtistRequestsService } from './artist-requests.service';
import { ArtistRequestsController } from './artist-requests.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AdminGuard } from '../auth/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArtistRequest.name, schema: ArtistRequestSchema },
    ]),
    AuthModule,
    UsersModule,
    SessionsModule,
    // JwtService debe ser resoluble en este módulo para el JwtAuthGuard
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('auth.jwtSecret') ?? 'change_me_in_production',
        signOptions: {
          expiresIn: (config.get<string>('auth.jwtExpiresIn') ??
            '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [ArtistRequestsController],
  providers: [ArtistRequestsService, AdminGuard],
  exports: [ArtistRequestsService],
})
export class ArtistRequestsModule {}
