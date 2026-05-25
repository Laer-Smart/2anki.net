import type { CookieOptions } from 'express';

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_JWT_EXPIRY = '30d';

// Auth cookie options, centralized so the 30-day lifetime and the security
// flags stay identical across every login path and can't drift. `secure` is on
// in production (prod is served HTTPS-only behind Apache) and off elsewhere so
// local dev over plain http still keeps the user signed in.
export function sessionCookieOptions(): CookieOptions {
  return {
    maxAge: SESSION_MAX_AGE_MS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}
