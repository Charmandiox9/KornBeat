import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { MONGO_COLLECTIONS } from '@kornbeat/shared';
import { ArtistAuthRequest } from './jwt-auth.guard';

/**
 * Sobre el JWT verificado, carga el usuario de 'usuarios' y exige
 * es_artist === true. Completa req.user con name/artistName/country.
 */
@Injectable()
export class ArtistGuard implements CanActivate {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ArtistAuthRequest>();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Token requerido');
    }
    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException('Token inválido');
    }

    const doc = await this.connection
      .collection(MONGO_COLLECTIONS.usuarios)
      .findOne({ _id: new Types.ObjectId(user.id) });

    if (!doc || !doc.active) {
      throw new ForbiddenException('Usuario no encontrado o inactivo');
    }
    if (!doc.es_artist) {
      throw new ForbiddenException('Esta función requiere una cuenta de artista');
    }

    request.user = {
      ...user,
      name: String(doc.name ?? user.email),
      artistName: String(doc.artist_name ?? doc.name ?? user.email),
      country: doc.country ?? null,
      es_artist: true,
    };
    return true;
  }
}
