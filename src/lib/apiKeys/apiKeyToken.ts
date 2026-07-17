import crypto from 'crypto';

export const API_KEY_PREFIX = 'sk_live_';
const RANDOM_BYTES = 24;
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

export interface GeneratedApiKey {
  /** The full secret. Returned once, never stored. */
  raw: string;
  /** SHA-256 hex of the raw key — this is what the DB stores. */
  hash: string;
  /** Non-secret leading slice shown in the dashboard to identify a key. */
  prefix: string;
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const raw =
    API_KEY_PREFIX + crypto.randomBytes(RANDOM_BYTES).toString('base64url');
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

export function looksLikeApiKey(value: string): boolean {
  return (
    value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length
  );
}

/**
 * Pull an `sk_live_...` secret out of an `Authorization: Bearer ...` header.
 * Returns null when the header is absent or is not a bearer API key — callers
 * then fall through to session-cookie auth.
 */
export function extractApiKeyFromHeader(
  header: string | undefined
): string | null {
  if (header == null) {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (match == null) {
    return null;
  }
  const token = match[1];
  return looksLikeApiKey(token) ? token : null;
}
