import { emailHash } from './emailHash';

describe('emailHash', () => {
  it('returns the same 64-character hex digest for the same email', () => {
    const hash = emailHash('al@example.com');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(emailHash('al@example.com')).toBe(hash);
  });

  it('normalizes casing and surrounding whitespace', () => {
    const canonical = emailHash('al@example.com');
    expect(emailHash('AL@Example.com')).toBe(canonical);
    expect(emailHash('  al@example.com  ')).toBe(canonical);
  });

  it('produces different hashes for different emails', () => {
    expect(emailHash('al@example.com')).not.toBe(emailHash('bob@example.com'));
  });
});
