import crypto from 'crypto';

import { verifyNotionWebhookSignature } from './notionWebhookSignature';

const sign = (body: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('verifyNotionWebhookSignature', () => {
  test('accepts a valid raw signature', () => {
    const body = '{"type":"page_updated"}';
    const secret = 'top-secret';
    expect(verifyNotionWebhookSignature(body, sign(body, secret), secret)).toBe(
      true
    );
  });

  test('accepts a sha256= prefixed signature', () => {
    const body = '{"type":"page_updated"}';
    const secret = 'top-secret';
    expect(
      verifyNotionWebhookSignature(body, `sha256=${sign(body, secret)}`, secret)
    ).toBe(true);
  });

  test('rejects a missing signature', () => {
    expect(verifyNotionWebhookSignature('{}', undefined, 'top-secret')).toBe(
      false
    );
  });

  test('rejects when the body is tampered', () => {
    const body = '{"type":"page_updated"}';
    const secret = 'top-secret';
    const sig = sign(body, secret);
    expect(verifyNotionWebhookSignature(`${body}!`, sig, secret)).toBe(false);
  });

  test('rejects when the secret is wrong', () => {
    const body = '{"type":"page_updated"}';
    expect(verifyNotionWebhookSignature(body, sign(body, 'a'), 'b')).toBe(
      false
    );
  });
});
