import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { IErrorEventRepository, ErrorEventInsert } from '../../data_layer/ErrorEventRepository';
import { FallbackErrorPayload } from '../../lib/errorFallback';
import { resolveClientIp } from '../../lib/rateLimit/ipHelpers';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

type FallbackWriter = (payload: FallbackErrorPayload) => void;

export const makeErrorCaptureMiddleware = (
  repository: IErrorEventRepository,
  writeFallback?: FallbackWriter,
  release: string | null = null
) => {
  return async (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const message = err?.message ?? String(err);
      const messageHash = sha256(message);
      const ipHash = sha256(resolveClientIp(req));

      const isDuplicate = await repository.existsWithinWindow(
        messageHash,
        ipHash,
        5 * 60_000
      );

      if (!isDuplicate) {
        const userId = typeof res.locals.owner === 'number' ? res.locals.owner : null;
        const row: ErrorEventInsert = {
          source: 'server',
          message_hash: messageHash,
          message,
          stack: err?.stack ?? null,
          url: req.originalUrl ?? null,
          release,
          ip_hash: ipHash,
          user_id: userId,
        };
        await repository.insert(row);
      }
    } catch {
      if (writeFallback != null) {
        const message = err?.message ?? String(err);
        writeFallback({
          source: 'server',
          message,
          stack: err?.stack,
          capturedAt: new Date().toISOString(),
          phase: 'db-outage',
        });
      }
    }
    next(err);
  };
};
