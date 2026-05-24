import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { IErrorEventRepository, ErrorEventInsert } from '../../data_layer/ErrorEventRepository';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolveIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export const makeErrorCaptureMiddleware = (repository: IErrorEventRepository) => {
  return async (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const message = err?.message ?? String(err);
      const messageHash = sha256(message);
      const ipHash = sha256(resolveIp(req));

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
          ip_hash: ipHash,
          user_id: userId,
        };
        await repository.insert(row);
      }
    } catch {
      // Never throw; ErrorHandler must still run
    }
    next(err);
  };
};
