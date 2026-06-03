import {
  buildNativeOAuthState,
  isNativeOAuthState,
  verifyNativeOAuthState,
} from './nativeOAuthState';

const SECRET = 'test-secret';

describe('nativeOAuthState', () => {
  it('round-trips the owner through build and verify', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    expect(verifyNativeOAuthState(state, SECRET, 1_000)).toBe(7);
  });

  it('rejects a tampered owner', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    const tampered = state.replace('native:7:', 'native:9:');
    expect(verifyNativeOAuthState(tampered, SECRET, 1_000)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    const parts = state.split(':');
    parts[3] = parts[3].replace(/.$/, (c) => (c === '0' ? '1' : '0'));
    expect(verifyNativeOAuthState(parts.join(':'), SECRET, 1_000)).toBeNull();
  });

  it('rejects a state signed with a different secret', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    expect(verifyNativeOAuthState(state, 'other-secret', 1_000)).toBeNull();
  });

  it('rejects an expired state past the 300s window', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    expect(verifyNativeOAuthState(state, SECRET, 1_000 + 300_001)).toBeNull();
  });

  it('accepts a state within the 300s window', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    expect(verifyNativeOAuthState(state, SECRET, 1_000 + 299_000)).toBe(7);
  });

  it('returns null when the secret is empty', () => {
    const state = buildNativeOAuthState(7, SECRET, 1_000);
    expect(verifyNativeOAuthState(state, '', 1_000)).toBeNull();
  });

  it('returns null for a bare native state with no owner', () => {
    expect(verifyNativeOAuthState('native', SECRET, 1_000)).toBeNull();
  });

  it('throws when building with a non-positive owner', () => {
    expect(() => buildNativeOAuthState(0, SECRET)).toThrow();
    expect(() => buildNativeOAuthState(-3, SECRET)).toThrow();
  });

  it('throws when building without a secret', () => {
    expect(() => buildNativeOAuthState(7, '')).toThrow();
  });

  it('recognises both the legacy bare and the signed native state', () => {
    expect(isNativeOAuthState('native')).toBe(true);
    expect(isNativeOAuthState(buildNativeOAuthState(7, SECRET))).toBe(true);
    expect(isNativeOAuthState('login:abc')).toBe(false);
    expect(isNativeOAuthState(undefined)).toBe(false);
  });
});
