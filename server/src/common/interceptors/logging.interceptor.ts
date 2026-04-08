import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Logs every request with:
 * - Request ID (for tracing across services)
 * - Method + path
 * - Response status
 * - Duration in ms
 *
 * Skips logging for health check to avoid noise.
 * Redacts authorization headers in log output.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    // Skip health check logging
    if (url === '/api/health' || url === '/health') {
      return next.handle();
    }

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - start;
          const requestId = (request as any).requestId || '-';

          this.logger.log(
            JSON.stringify({
              request_id: requestId,
              method,
              path: url,
              status: response.statusCode,
              duration_ms: duration,
              user_id: (request as any).user?.id || null,
            }),
          );
        },
        error: () => {
          // Error logging is handled by GlobalExceptionFilter
          // Just log the duration here
          const duration = Date.now() - start;
          const requestId = (request as any).requestId || '-';

          this.logger.warn(
            JSON.stringify({
              request_id: requestId,
              method,
              path: url,
              status: 'error',
              duration_ms: duration,
            }),
          );
        },
      }),
    );
  }
}
