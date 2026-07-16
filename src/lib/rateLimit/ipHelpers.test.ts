import crypto from 'node:crypto';
import express from 'express';
import { resolveClientIp, hashIp } from './ipHelpers';

function makeReq(
  headers: Record<string, unknown>,
  remoteAddress?: string,
  ip?: string
): express.Request {
  return {
    ip,
    headers,
    socket: { remoteAddress },
  } as unknown as express.Request;
}

describe('resolveClientIp', () => {
  it('prefers req.ip and ignores a conflicting x-forwarded-for', () => {
    const req = makeReq(
      { 'x-forwarded-for': '1.2.3.4' },
      '10.0.0.1',
      '203.0.113.7'
    );
    expect(resolveClientIp(req)).toBe('203.0.113.7');
  });

  it('returns the x-forwarded-for value when present', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.7' }, '10.0.0.1');
    expect(resolveClientIp(req)).toBe('203.0.113.7');
  });

  it('returns the first hop of a comma-separated x-forwarded-for', () => {
    const req = makeReq(
      { 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' },
      '10.0.0.1'
    );
    expect(resolveClientIp(req)).toBe('203.0.113.7');
  });

  it('trims whitespace around the first hop', () => {
    const req = makeReq({ 'x-forwarded-for': '  203.0.113.7 , 70.41.3.18' });
    expect(resolveClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to socket.remoteAddress when x-forwarded-for is missing', () => {
    const req = makeReq({}, '198.51.100.4');
    expect(resolveClientIp(req)).toBe('198.51.100.4');
  });

  it("returns 'unknown' when neither header nor remoteAddress is present", () => {
    const req = makeReq({});
    expect(resolveClientIp(req)).toBe('unknown');
  });

  it('tolerates a req with no headers property and falls back', () => {
    const req = {
      socket: { remoteAddress: '198.51.100.9' },
    } as unknown as express.Request;
    expect(resolveClientIp(req)).toBe('198.51.100.9');
  });

  it("returns 'unknown' for a req with neither headers nor socket", () => {
    const req = {} as unknown as express.Request;
    expect(resolveClientIp(req)).toBe('unknown');
  });
});

describe('hashIp', () => {
  it('produces a 64-character hex sha256 digest', () => {
    const digest = hashIp('203.0.113.7');
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashIp('203.0.113.7')).toBe(hashIp('203.0.113.7'));
  });

  it('matches a direct sha256 hex computation', () => {
    const expected = crypto
      .createHash('sha256')
      .update('203.0.113.7')
      .digest('hex');
    expect(hashIp('203.0.113.7')).toBe(expected);
  });

  it('produces different digests for different inputs', () => {
    expect(hashIp('203.0.113.7')).not.toBe(hashIp('203.0.113.8'));
  });
});
