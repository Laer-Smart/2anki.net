import crypto from 'node:crypto';

import { verifySendgridEventWebhookSignature } from './sendgridEventWebhookSignature';

interface SignedFixture {
  publicKeyBase64: string;
  signature: string;
  timestamp: string;
  payload: string;
}

function buildSignedFixture(payload: string, timestamp: string): SignedFixture {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const publicKeyBase64 = publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
  const signature = crypto
    .sign('sha256', Buffer.from(timestamp + payload, 'utf8'), {
      key: privateKey,
      dsaEncoding: 'der',
    })
    .toString('base64');
  return { publicKeyBase64, signature, timestamp, payload };
}

describe('verifySendgridEventWebhookSignature', () => {
  const now = new Date('2026-06-06T12:00:00.000Z');
  const freshTimestamp = String(Math.floor(now.getTime() / 1000));

  it('accepts a signature produced over timestamp + raw payload', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(true);
  });

  it('rejects when the payload is tampered after signing', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload + 'tampered',
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects when the timestamp header is altered', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: String(Number(freshTimestamp) + 1),
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects a missing signature', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: undefined,
      timestamp: fixture.timestamp,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects a missing timestamp', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: undefined,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects an empty verification key', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: '',
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects a stale timestamp outside the tolerance window (replay)', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const staleTimestamp = String(Math.floor(now.getTime() / 1000) - 60 * 60);
    const fixture = buildSignedFixture(payload, staleTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects a future timestamp outside the tolerance window', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const futureTimestamp = String(Math.floor(now.getTime() / 1000) + 60 * 60);
    const fixture = buildSignedFixture(payload, futureTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: fixture.publicKeyBase64,
      now,
    });

    expect(result).toBe(false);
  });

  it('rejects a malformed verification key without throwing', () => {
    const payload = JSON.stringify([{ event: 'bounce' }]);
    const fixture = buildSignedFixture(payload, freshTimestamp);

    const result = verifySendgridEventWebhookSignature({
      rawBody: payload,
      signature: fixture.signature,
      timestamp: fixture.timestamp,
      publicKeyBase64: 'not-a-real-key',
      now,
    });

    expect(result).toBe(false);
  });
});
