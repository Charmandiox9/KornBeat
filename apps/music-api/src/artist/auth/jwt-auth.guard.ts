import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface ArtistAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    artistName?: string;
    country?: string | null;
    es_artist?: boolean;
  };
}

/**
 * Verifica el JWT emitido por auth-api (mismo JWT_SECRET) y fija
 * req.user = { id, email }. El ArtistGuard completa los datos.
 */
@Injectable()
export class MusicJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ArtistAuthRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    try {
      const decoded = await this.jwtService.verifyAsync<{
        id: string;
        email: string;
      }>(token, {
        secret: this.configService.get<string>('music.jwtSecret'),
      });
      request.user = decoded;
      return true;
    } catch {
      throw new ForbiddenException('Token inválido');
    }
  }

  private extractToken(request: ArtistAuthRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
