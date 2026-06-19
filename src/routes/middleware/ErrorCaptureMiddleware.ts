import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import {
  IErrorEventRepository,
  ErrorEventInsert,
} from '../../data_layer/ErrorEventRepository';
import { FallbackErrorPayload } from '../../lib/errorFallback';
import { resolveClientIp } from '../../lib/rateLimit/ipHelpers';
import { buildUnknownPythonErrorContext } from '../../lib/anki/scrubPythonRawOutput';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

type FallbackWriter = (payload: FallbackErrorPayload) => void;

/**
 * body-parser tags a request with an unparseable JSON body as
 * `entity.parse.failed`. These are overwhelmingly scanner probes POSTing
 * garbage to exploit paths (/_bulk, /jeecg-boot/..., telemetry endpoints) —
 * a client fault, not a server error. Recording them buries real crashes in
 * the error dashboard. ErrorHandler still returns 400 to the caller.
 */
const isMalformedRequestBody = (err: Error): boolean =>
  (err as { type?: string })?.type === 'entity.parse.failed';

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
    if (isMalformedRequestBody(err)) {
      next(err);
      return;
    }
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
        const userId =
          typeof res.locals.owner === 'number' ? res.locals.owner : null;
        const row: ErrorEventInsert = {
          source: 'server',
          message_hash: messageHash,
          message,
          stack: err?.stack ?? null,
          url: req.originalUrl ?? null,
          release,
          ip_hash: ipHash,
          user_id: userId,
          context: buildUnknownPythonErrorContext(err),
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
