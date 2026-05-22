import { describe, it, expect } from 'vitest';
import {
  readSignupOrigin,
  persistSignupOrigin,
  SIGNUP_ORIGIN_KEY,
} from './signupOrigin';

function buildStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

describe('readSignupOrigin', () => {
  it('returns the source query param when it matches the landing pattern', () => {
    const storage = buildStorage();
    expect(readSignupOrigin('?source=/notion-to-anki', storage)).toBe(
      '/notion-to-anki'
    );
  });

  it('falls back to sessionStorage when the query param is missing', () => {
    const storage = buildStorage({ [SIGNUP_ORIGIN_KEY]: '/pdf-to-anki' });
    expect(readSignupOrigin('', storage)).toBe('/pdf-to-anki');
  });

  it('returns null when neither source is set', () => {
    expect(readSignupOrigin('', buildStorage())).toBeNull();
  });

  it('rejects an invalid query value but still consults storage', () => {
    const storage = buildStorage({
      [SIGNUP_ORIGIN_KEY]: '/quizlet-to-anki',
    });
    expect(readSignupOrigin('?source=<script>', storage)).toBe(
      '/quizlet-to-anki'
    );
  });

  it('rejects an invalid stored value', () => {
    const storage = buildStorage({
      [SIGNUP_ORIGIN_KEY]: 'http://evil.example.com',
    });
    expect(readSignupOrigin('', storage)).toBeNull();
  });

  it.each([
    '/usmle-anki',
    '/nursing-flashcards',
    '/anki-from-medical-lecture-slides',
  ])('resolves %s from the source query param', (pathname) => {
    const storage = buildStorage();
    expect(readSignupOrigin(`?source=${pathname}`, storage)).toBe(pathname);
  });

  it.each([
    '/usmle-anki',
    '/nursing-flashcards',
    '/anki-from-medical-lecture-slides',
  ])('resolves %s from sessionStorage when query param is absent', (pathname) => {
    const storage = buildStorage({ [SIGNUP_ORIGIN_KEY]: pathname });
    expect(readSignupOrigin('', storage)).toBe(pathname);
  });
});

describe('persistSignupOrigin', () => {
  it('writes valid pathnames to storage', () => {
    const storage = buildStorage();
    persistSignupOrigin('/markdown-to-anki', storage);
    expect(storage.store[SIGNUP_ORIGIN_KEY]).toBe('/markdown-to-anki');
  });

  it('ignores invalid pathnames', () => {
    const storage = buildStorage();
    persistSignupOrigin('/Markdown-To-Anki', storage);
    expect(storage.store[SIGNUP_ORIGIN_KEY]).toBeUndefined();
  });

  it('is a no-op when storage is unavailable', () => {
    expect(() => persistSignupOrigin('/pdf-to-anki', null)).not.toThrow();
  });

  it('persists each of the three medical landing paths', () => {
    const medicalPaths = [
      '/usmle-anki',
      '/nursing-flashcards',
      '/anki-from-medical-lecture-slides',
    ];
    for (const pathname of medicalPaths) {
      const storage = buildStorage();
      persistSignupOrigin(pathname, storage);
      expect(storage.store[SIGNUP_ORIGIN_KEY]).toBe(pathname);
    }
  });
});
