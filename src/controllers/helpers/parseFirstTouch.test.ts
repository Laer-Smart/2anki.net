import { parseFirstTouch } from './parseFirstTouch';

describe('parseFirstTouch', () => {
  it('extracts a landing path and referrer hostname from a valid cookie', () => {
    const raw = JSON.stringify({
      landingPath: '/pdf-to-anki',
      referrer: 'chatgpt.com',
    });
    expect(parseFirstTouch(raw)).toEqual({
      signupOrigin: '/pdf-to-anki',
      signupReferrer: 'chatgpt.com',
    });
  });

  it('accepts multi-segment landing paths the legacy allowlist rejected', () => {
    const raw = JSON.stringify({ landingPath: '/blog/notion-to-anki' });
    expect(parseFirstTouch(raw).signupOrigin).toBe('/blog/notion-to-anki');
  });

  it('lowercases the referrer hostname', () => {
    const raw = JSON.stringify({
      landingPath: '/',
      referrer: 'Perplexity.AI',
    });
    expect(parseFirstTouch(raw).signupReferrer).toBe('perplexity.ai');
  });

  it('returns nulls for a non-string input', () => {
    expect(parseFirstTouch(undefined)).toEqual({
      signupOrigin: null,
      signupReferrer: null,
    });
  });

  it('returns nulls for malformed JSON', () => {
    expect(parseFirstTouch('{not-json')).toEqual({
      signupOrigin: null,
      signupReferrer: null,
    });
  });

  it('rejects a landing path with markup, quotes, or control characters', () => {
    for (const path of [
      '/upload<script>',
      '/a"b',
      '/a\nb',
      '/answers/pdf?x=1',
      '/a b',
    ]) {
      const raw = JSON.stringify({ landingPath: path, referrer: null });
      expect(parseFirstTouch(raw).signupOrigin).toBeNull();
    }
  });

  it('rejects a landing path that does not start with a slash', () => {
    const raw = JSON.stringify({ landingPath: 'pdf-to-anki' });
    expect(parseFirstTouch(raw).signupOrigin).toBeNull();
  });

  it('rejects a landing path longer than 200 characters', () => {
    const raw = JSON.stringify({ landingPath: `/${'a'.repeat(200)}` });
    expect(parseFirstTouch(raw).signupOrigin).toBeNull();
  });

  it('rejects a referrer with a path or query to avoid storing a full URL', () => {
    const raw = JSON.stringify({
      landingPath: '/',
      referrer: 'chatgpt.com/share/abc?ref=1',
    });
    expect(parseFirstTouch(raw).signupReferrer).toBeNull();
  });

  it('rejects a referrer hostname longer than 100 characters', () => {
    const raw = JSON.stringify({
      landingPath: '/',
      referrer: `${'a'.repeat(101)}.com`,
    });
    expect(parseFirstTouch(raw).signupReferrer).toBeNull();
  });

  it('keeps a valid landing path even when the referrer is invalid', () => {
    const raw = JSON.stringify({
      landingPath: '/quizlet-to-anki',
      referrer: 'not a host',
    });
    expect(parseFirstTouch(raw)).toEqual({
      signupOrigin: '/quizlet-to-anki',
      signupReferrer: null,
    });
  });
});
