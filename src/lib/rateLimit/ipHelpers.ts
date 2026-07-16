import crypto from 'node:crypto';
import express from 'express';

export function resolveClientIp(req: express.Request): string {
  // req.ip is set by Express when 'trust proxy' is configured; it respects the
  // trust setting and ignores attacker-prepended X-Forwarded-For hops. Fall
  // back to the raw header + socket address for tests and for hypothetical
  // call sites where trust proxy isn't on the app instance.
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    return req.ip;
  }
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first.length > 0) return first;
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function hashIp(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
