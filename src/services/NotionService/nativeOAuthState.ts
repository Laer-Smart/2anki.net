import crypto from 'node:crypto';

const NATIVE_PREFIX = 'native';
const MAX_AGE_MS = 300_000;
const HMAC_HEX = /^[0-9a-f]{64}$/;

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildNativeOAuthState(
  owner: number,
  secret: string,
  now: number = Date.now()
): string {
  if (!Number.isInteger(owner) || owner <= 0) {
    throw new Error('owner must be a positive integer');
  }
  if (secret.length === 0) {
    throw new Error('secret is required to sign native OAuth state');
  }
  const payload = `${owner}:${now}`;
  return `${NATIVE_PREFIX}:${payload}:${sign(payload, secret)}`;
}

export function isNativeOAuthState(state: string | undefined): boolean {
  return state === NATIVE_PREFIX || (state?.startsWith(`${NATIVE_PREFIX}:`) ?? false);
}

export function verifyNativeOAuthState(
  state: string,
  secret: string,
  now: number = Date.now()
): number | null {
  if (secret.length === 0) {
    return null;
  }
  const parts = state.split(':');
  if (parts.length !== 4 || parts[0] !== NATIVE_PREFIX) {
    return null;
  }
  const [, ownerStr, tsStr, providedHmac] = parts;
  const owner = Number.parseInt(ownerStr, 10);
  const timestamp = Number.parseInt(tsStr, 10);
  if (
    !Number.isInteger(owner) ||
    owner <= 0 ||
    String(owner) !== ownerStr ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }
  if (now - timestamp > MAX_AGE_MS || timestamp - now > MAX_AGE_MS) {
    return null;
  }
  if (!HMAC_HEX.test(providedHmac)) {
    return null;
  }
  const expected = sign(`${ownerStr}:${tsStr}`, secret);
  const matches = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(providedHmac, 'hex')
  );
  return matches ? owner : null;
}
