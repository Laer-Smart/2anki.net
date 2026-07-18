import {
  computeConsentToken,
  consentTokenMatches,
  renderConsentPage,
} from './consent';

const SECRET = 'unit-test-secret';

describe('consent CSRF token', () => {
  it('is deterministic for a session but differs across sessions', () => {
    const a = computeConsentToken('session-a', SECRET);
    expect(computeConsentToken('session-a', SECRET)).toBe(a);
    expect(computeConsentToken('session-b', SECRET)).not.toBe(a);
  });

  it('changes when the signing secret changes', () => {
    expect(computeConsentToken('s', SECRET)).not.toBe(
      computeConsentToken('s', 'other-secret')
    );
  });

  it('matches only the exact token and rejects forgeries and bad shapes', () => {
    const token = computeConsentToken('session', SECRET);
    expect(consentTokenMatches(token, token)).toBe(true);
    expect(consentTokenMatches(token, 'forged')).toBe(false);
    expect(consentTokenMatches(token, token + 'x')).toBe(false);
    expect(consentTokenMatches(token, undefined)).toBe(false);
    expect(consentTokenMatches(token, 42)).toBe(false);
  });
});

describe('renderConsentPage', () => {
  it('embeds the OAuth params as hidden fields plus a CSRF field', () => {
    const html = renderConsentPage({
      actionPath: '/authorize',
      clientName: 'Claude',
      scopes: ['mcp'],
      csrf: 'csrf-token-123',
      fields: {
        client_id: 'abc',
        redirect_uri: 'https://claude.ai/callback',
        code_challenge: 'chal',
        state: 'xyz',
        empty: '',
      },
    });
    expect(html).toContain('name="csrf" value="csrf-token-123"');
    expect(html).toContain('name="client_id" value="abc"');
    expect(html).toContain('name="consent" value="approve"');
    expect(html).toContain('name="consent" value="deny"');
    expect(html).toContain('action="/authorize"');
    expect(html).not.toContain('name="empty"');
  });

  it('escapes a malicious client name to prevent HTML injection', () => {
    const html = renderConsentPage({
      actionPath: '/authorize',
      clientName: '<script>alert(1)</script>',
      scopes: [],
      csrf: 'x',
      fields: {},
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
