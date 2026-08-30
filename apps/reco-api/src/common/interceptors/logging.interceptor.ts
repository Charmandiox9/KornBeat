import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
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
    const req = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      user?: { id?: string; _id?: string };
    }>();
    const { method, originalUrl } = req;
    const user = req.user?.id ?? req.user?._id;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
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
