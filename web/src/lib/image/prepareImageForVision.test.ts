import { describe, it, expect } from 'vitest';
import { approxBytesFromBase64, initialScale } from './prepareImageForVision';

describe('approxBytesFromBase64', () => {
  it('estimates decoded byte size from base64 length (3 bytes per 4 chars)', () => {
    expect(approxBytesFromBase64('')).toBe(0);
    expect(approxBytesFromBase64('AAAA')).toBe(3);
    expect(approxBytesFromBase64('A'.repeat(8))).toBe(6);
  });
});

describe('initialScale', () => {
  it('returns 1 when the long edge is within the cap', () => {
    expect(initialScale(1000, 800)).toBe(1);
    expect(initialScale(1568, 1568)).toBe(1);
  });

  it('scales down so the long edge hits the cap', () => {
    expect(initialScale(3136, 1000)).toBe(0.5);
    expect(initialScale(1000, 3136)).toBe(0.5);
  });
});
