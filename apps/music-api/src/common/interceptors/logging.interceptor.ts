import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Solo se registra en desarrollo (NODE_ENV !== 'production'):
 * logs de cada request con método, ruta, status, duración y user.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const user =
      (req as Request & { user?: { id?: string; _id?: string } }).user?.id ??
      (req as Request & { user?: { id?: string; _id?: string } }).user?._id;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        const duration = Date.now() - start;
        this.logger.log(
          `${method} ${originalUrl} -> ${res.statusCode} (${duration} ms)${
            user ? ` [user: ${user}]` : ''
          }`,
        );
      }),
    );
  }
}
