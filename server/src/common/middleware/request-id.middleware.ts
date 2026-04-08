import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every incoming request.
 * If the client sends X-Request-ID, we use that (for distributed tracing).
 * Otherwise, we generate one.
 *
 * The ID is:
 * - Attached to request.requestId (used by logging + error filter)
 * - Added to response header X-Request-ID (returned to client for support tickets)
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || randomUUID();

    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
