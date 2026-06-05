import { getClientRelease } from './release';

describe('getClientRelease', () => {
  it('returns the injected release', () => {
    expect(getClientRelease('abc1234')).toBe('abc1234');
  });

  it('trims surrounding whitespace', () => {
    expect(getClientRelease(' abc1234\n')).toBe('abc1234');
  });

  it('returns null for an empty string', () => {
    expect(getClientRelease('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(getClientRelease('   ')).toBeNull();
  });
});
