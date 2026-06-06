import crypto from 'node:crypto';

const TIMESTAMP_TOLERANCE_SECONDS = 10 * 60;

export interface VerifySendgridEventWebhookSignatureInput {
  rawBody: string;
  signature: string | undefined;
  timestamp: string | undefined;
  publicKeyBase64: string;
  now: Date;
}

function isTimestampFresh(timestamp: string, now: Date): boolean {
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return Math.abs(nowSeconds - timestampSeconds) <= TIMESTAMP_TOLERANCE_SECONDS;
}

function loadPublicKey(publicKeyBase64: string): crypto.KeyObject | null {
  try {
    return crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
  } catch {
    return null;
  }
}

export function verifySendgridEventWebhookSignature(
  input: VerifySendgridEventWebhookSignatureInput
): boolean {
  const { rawBody, signature, timestamp, publicKeyBase64, now } = input;

  const hasCredentials =
    signature != null &&
    signature.length > 0 &&
    timestamp != null &&
    timestamp.length > 0 &&
    publicKeyBase64.length > 0;
  if (!hasCredentials) {
    return false;
  }

  if (!isTimestampFresh(timestamp, now)) {
    return false;
  }

  const publicKey = loadPublicKey(publicKeyBase64);
  if (publicKey == null) {
    return false;
  }

  try {
    return crypto.verify(
      'sha256',
      Buffer.from(timestamp + rawBody, 'utf8'),
      { key: publicKey, dsaEncoding: 'der' },
      Buffer.from(signature, 'base64')
    );
  } catch {
    return false;
  }
}
