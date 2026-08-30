import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { User } from '@kornbeat/shared';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';

export interface AuthRequest extends Request {
  user?: { id: string; email: string } & Partial<User>;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    try {
      const decoded = await this.jwtService.verifyAsync<{
        id: string;
        email: string;
      }>(token);

      let user = await this.sessionsService.getCachedUser(decoded.id);

      if (!user) {
        const dbUser = await this.usersService.findByIdPublic(decoded.id);
        if (!dbUser) {
          throw new ForbiddenException('Usuario no encontrado');
        }
        user = {
          _id: dbUser._id.toString(),
          username: dbUser.username,
          name: dbUser.name,
          email: dbUser.email,
          country: dbUser.country ?? null,
          date_of_birth: dbUser.date_of_birth
            ? dbUser.date_of_birth.toISOString()
            : null,
          is_premium: dbUser.is_premium,
          es_artist: dbUser.es_artist,
          artist_name: dbUser.artist_name ?? null,
          isAdmin: dbUser.isAdmin ?? false,
          date_of_register: dbUser.date_of_register,
          active: dbUser.active,
        };
        await this.sessionsService.cacheUser(decoded.id, user);
      }

      request.user = { ...decoded, ...user };
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) {
        throw err;
      }
      throw new ForbiddenException('Token inválido');
    }
  }

  private extractToken(request: AuthRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
