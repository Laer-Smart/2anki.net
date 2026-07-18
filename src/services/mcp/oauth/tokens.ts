import crypto from 'crypto';

export const ACCESS_TOKEN_PREFIX = 'mcp_at_';
export const REFRESH_TOKEN_PREFIX = 'mcp_rt_';
export const AUTH_CODE_PREFIX = 'mcp_ac_';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_CODE_TTL_SECONDS = 60 * 5;

const RANDOM_BYTES = 32;

export function hashSecret(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateOpaque(prefix: string): string {
  return prefix + crypto.randomBytes(RANDOM_BYTES).toString('base64url');
}

export function generateAccessToken(): string {
  return generateOpaque(ACCESS_TOKEN_PREFIX);
}

export function generateRefreshToken(): string {
  return generateOpaque(REFRESH_TOKEN_PREFIX);
}

export function generateAuthorizationCode(): string {
  return generateOpaque(AUTH_CODE_PREFIX);
}

export function generateClientId(): string {
  return crypto.randomUUID();
}

export function fingerprint(raw: string): string {
  return hashSecret(raw).slice(0, 12);
}
