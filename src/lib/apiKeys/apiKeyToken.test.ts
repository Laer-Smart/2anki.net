import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  extractApiKeyFromHeader,
} from './apiKeyToken';

describe('apiKeyToken', () => {
  it('generates a prefixed secret, its sha256 hash, and a non-secret display prefix', () => {
    const key = generateApiKey();
    expect(key.raw.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(key.hash).toBe(hashApiKey(key.raw));
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(key.raw.startsWith(key.prefix)).toBe(true);
    expect(key.prefix.length).toBeLessThan(key.raw.length);
  });

  it('generates a distinct secret each call', () => {
    expect(generateApiKey().raw).not.toBe(generateApiKey().raw);
  });

  it('hashes deterministically', () => {
    expect(hashApiKey('sk_live_abc')).toBe(hashApiKey('sk_live_abc'));
    expect(hashApiKey('sk_live_abc')).not.toBe(hashApiKey('sk_live_abd'));
  });

  it('recognizes only prefixed keys', () => {
    expect(looksLikeApiKey('sk_live_xyz')).toBe(true);
    expect(looksLikeApiKey('sk_live_')).toBe(false);
    expect(looksLikeApiKey('nope')).toBe(false);
  });

  describe('extractApiKeyFromHeader', () => {
    it('pulls the key out of a bearer header', () => {
      expect(extractApiKeyFromHeader('Bearer sk_live_abc')).toBe('sk_live_abc');
      expect(extractApiKeyFromHeader('bearer sk_live_abc')).toBe('sk_live_abc');
    });

    it('returns null for a non-key bearer (session JWT), so it falls through to cookie auth', () => {
      expect(
        extractApiKeyFromHeader('Bearer eyJhbGci.session.token')
      ).toBeNull();
    });

    it('returns null for absent or malformed headers', () => {
      expect(extractApiKeyFromHeader(undefined)).toBeNull();
      expect(extractApiKeyFromHeader('')).toBeNull();
      expect(extractApiKeyFromHeader('sk_live_abc')).toBeNull();
    });
  });
});
