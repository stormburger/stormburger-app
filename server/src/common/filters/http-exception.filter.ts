import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catches all exceptions and returns a consistent JSON error format.
 *
 * Response shape:
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Human-readable message",
 *     "details": { ... }
 *   },
 *   "meta": {
 *     "request_id": "uuid",
 *     "timestamp": "iso8601"
 *   }
 * }
 *
 * In production, stack traces and internal error details are stripped.
 * In development, they're included for debugging.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    let status: number;
    let code: string;
    let message: string;
    let details: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = this.statusToCode(status);
      } else if (typeof body === 'object') {
        const obj = body as Record<string, any>;
        message = obj.message || exception.message;
        code = obj.code || this.statusToCode(status);

        // class-validator returns message as array
        if (Array.isArray(message)) {
          details.validation = message;
          message = message[0];
          code = 'VALIDATION_ERROR';
        }
      } else {
        message = exception.message;
        code = this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      // Unhandled error — this is a bug. Log it fully, return generic message.
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error(`Unknown exception type: ${exception}`);
    }

    // Log all errors (except 404s in production — too noisy)
    if (status !== 404 || process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        JSON.stringify({
          request_id: requestId,
          method: request.method,
          path: request.url,
          status,
          code,
          message,
        }),
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(Object.keys(details).length > 0 ? { details } : {}),
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'ERROR';
  }
}
