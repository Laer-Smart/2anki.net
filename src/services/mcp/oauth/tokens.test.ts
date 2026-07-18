import {
  ACCESS_TOKEN_PREFIX,
  REFRESH_TOKEN_PREFIX,
  AUTH_CODE_PREFIX,
  generateAccessToken,
  generateAuthorizationCode,
  generateRefreshToken,
  hashSecret,
} from './tokens';

describe('mcp token helpers', () => {
  it('prefixes each token kind and produces unique values', () => {
    const a = generateAccessToken();
    const b = generateAccessToken();
    expect(a.startsWith(ACCESS_TOKEN_PREFIX)).toBe(true);
    expect(a).not.toEqual(b);
    expect(generateRefreshToken().startsWith(REFRESH_TOKEN_PREFIX)).toBe(true);
    expect(generateAuthorizationCode().startsWith(AUTH_CODE_PREFIX)).toBe(true);
  });

  it('hashes deterministically and never returns the raw secret', () => {
    const raw = generateAccessToken();
    const hash = hashSecret(raw);
    expect(hash).toEqual(hashSecret(raw));
    expect(hash).not.toContain(raw);
    expect(hash).toHaveLength(64);
  });
});
