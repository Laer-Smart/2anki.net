import crypto from 'node:crypto';
import express from 'express';

export function resolveClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function hashIp(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
