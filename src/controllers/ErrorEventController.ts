import crypto from 'crypto';
import { Request, Response } from 'express';
import { IngestErrorEventUseCase, ErrorEventPayload } from '../usecases/events/IngestErrorEventUseCase';

const MAX_BODY_BYTES = 10 * 1024;
const RATE_WINDOW_MS = 60_000;
const PER_IP_MAX = 10;
const GLOBAL_MAX = 1000;

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(ipHash: string): boolean;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly ipBuckets = new Map<string, RateBucket>();
  private globalBucket: RateBucket;

  constructor(
    private readonly windowMs = RATE_WINDOW_MS,
    private readonly perIpMax = PER_IP_MAX,
    private readonly globalMax = GLOBAL_MAX
  ) {
    this.globalBucket = { count: 0, resetAt: Date.now() + this.windowMs };
  }

  check(ipHash: string): boolean {
    const now = Date.now();

    if (now >= this.globalBucket.resetAt) {
      this.globalBucket = { count: 0, resetAt: now + this.windowMs };
    }
    if (this.globalBucket.count >= this.globalMax) {
      return false;
    }
    this.globalBucket.count += 1;

    const existing = this.ipBuckets.get(ipHash);
    if (existing == null || now >= existing.resetAt) {
      this.ipBuckets.set(ipHash, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (existing.count >= this.perIpMax) {
      this.globalBucket.count -= 1;
      return false;
    }
    existing.count += 1;
    return true;
  }
}

function hashIp(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function resolveIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function validatePayload(body: unknown): ErrorEventPayload | null {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const b = body as Record<string, unknown>;
  if (typeof b.message !== 'string' || b.message.trim().length === 0) {
    return null;
  }
  return {
    message: b.message,
    stack: typeof b.stack === 'string' ? b.stack : null,
    url: typeof b.url === 'string' ? b.url : null,
    userAgent: typeof b.userAgent === 'string' ? b.userAgent : null,
    release: typeof b.release === 'string' ? b.release : null,
    userId: typeof b.userId === 'number' ? b.userId : null,
    context:
      b.context != null && typeof b.context === 'object' && !Array.isArray(b.context)
        ? (b.context as Record<string, unknown>)
        : null,
  };
}

export class ErrorEventController {
  private readonly rateLimiter: RateLimiter;

  constructor(
    private readonly ingestUseCase: IngestErrorEventUseCase,
    rateLimiter?: RateLimiter
  ) {
    this.rateLimiter = rateLimiter ?? new InMemoryRateLimiter();
  }

  async ingest(req: Request, res: Response): Promise<void> {
    const rawBody = JSON.stringify(req.body);
    if (rawBody.length > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }

    const payload = validatePayload(req.body);
    if (payload == null) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const rawIp = resolveIp(req);
    const ipHash = hashIp(rawIp);

    const allowed = this.rateLimiter.check(ipHash);
    if (!allowed) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    const source = req.body.source === 'server' ? 'server' : 'web';

    await this.ingestUseCase.execute({ source, payload, ipHash });
    res.status(202).end();
  }
}
