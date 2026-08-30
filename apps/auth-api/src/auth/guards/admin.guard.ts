import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthRequest } from './jwt-auth.guard';

/**
 * Exige user.isAdmin === true (campo del documento 'usuarios').
 * Debe usarse DESPUÉS de JwtAuthGuard, que puebla request.user.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.user?.isAdmin !== true) {
      throw new ForbiddenException('Acceso restringido a administradores');
    }
    return true;
  }
}
