import { describe, expect, it } from 'vitest';
import {
  assertGoogleApiKeyShape,
  describeGoogleApiKeyProblem,
} from './assertGoogleApiKeyShape';

const FAKE_API_KEY_PREFIX = 'AIza' + 'FAKE_TEST_VALUE_NOT_REAL';
const FAKE_OAUTH_SECRET = 'GOCSPX-' + 'fake-oauth-secret';

describe('assertGoogleApiKeyShape', () => {
  it('accepts an AIza-prefixed API key', () => {
    const shape = assertGoogleApiKeyShape(FAKE_API_KEY_PREFIX);
    expect(shape.valid).toBe(true);
    if (shape.valid) {
      expect(shape.key).toBe(FAKE_API_KEY_PREFIX);
    }
  });

  it('rejects an OAuth Client Secret pasted in by mistake', () => {
    const shape = assertGoogleApiKeyShape(FAKE_OAUTH_SECRET);
    expect(shape.valid).toBe(false);
    if (!shape.valid) {
      expect(shape.reason).toBe('oauth-client-secret');
      expect(describeGoogleApiKeyProblem(shape)).toContain('GOCSPX-');
      expect(describeGoogleApiKeyProblem(shape)).toContain('public JS bundle');
    }
  });

  it('rejects empty input', () => {
    expect(assertGoogleApiKeyShape('')).toMatchObject({ valid: false, reason: 'empty' });
    expect(assertGoogleApiKeyShape(undefined)).toMatchObject({ valid: false, reason: 'empty' });
    expect(assertGoogleApiKeyShape(null)).toMatchObject({ valid: false, reason: 'empty' });
    expect(assertGoogleApiKeyShape('   ')).toMatchObject({ valid: false, reason: 'empty' });
  });

  it('rejects anything that does not start with AIza', () => {
    const shape = assertGoogleApiKeyShape('not-a-real-key');
    expect(shape.valid).toBe(false);
    if (!shape.valid) {
      expect(shape.reason).toBe('unrecognized');
      expect(describeGoogleApiKeyProblem(shape)).toContain('AIza');
    }
  });

  it('trims surrounding whitespace before evaluating', () => {
    expect(assertGoogleApiKeyShape(`  ${FAKE_API_KEY_PREFIX}  `)).toMatchObject({ valid: true });
    expect(assertGoogleApiKeyShape(` ${FAKE_OAUTH_SECRET} `)).toMatchObject({
      valid: false,
      reason: 'oauth-client-secret',
    });
  });
});
