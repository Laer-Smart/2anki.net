import { describe, expect, it } from 'vitest';
import { hasDoc, loadDoc, resolveSlug } from './loader';

describe('resolveSlug', () => {
  it('passes through unknown slugs unchanged', () => {
    expect(resolveSlug('start-here/connect-notion')).toBe(
      'start-here/connect-notion'
    );
  });

  it('rewrites a redirect slug to its target', () => {
    expect(resolveSlug('guides/getting-started')).toBe(
      'start-here/connect-notion'
    );
    expect(resolveSlug('features/notion-support')).toBe('cards/notion-blocks');
  });
});

describe('loadDoc', () => {
  it('loads a current slug', () => {
    const doc = loadDoc('start-here/connect-notion');
    expect(doc).not.toBeNull();
    expect(doc?.frontmatter.title).toBe('Connect Notion in 5 minutes');
  });

  it('follows redirects to the underlying file', () => {
    const doc = loadDoc('guides/getting-started');
    expect(doc).not.toBeNull();
    expect(doc?.frontmatter.title).toBe('Connect Notion in 5 minutes');
  });

  it('returns null for an unmapped slug', () => {
    expect(loadDoc('does/not/exist')).toBeNull();
  });

  it('serves the German doc when language is de and a translation exists', () => {
    const doc = loadDoc('start-here/what-is-2anki', 'de');
    expect(doc).not.toBeNull();
    expect(doc?.frontmatter.title).toBe('Was ist 2anki?');
    expect(doc?.sourcePath).toBe(
      'web/src/pages/DocsPage/content/de/start-here/what-is-2anki.md'
    );
  });

  it('serves the German cards doc when language is de', () => {
    const doc = loadDoc('cards/card-types', 'de');
    expect(doc).not.toBeNull();
    expect(doc?.frontmatter.title).toBe('Kartentypen');
    expect(doc?.sourcePath).toBe(
      'web/src/pages/DocsPage/content/de/cards/card-types.md'
    );
  });

  it('falls back to English for legal docs left untranslated', () => {
    const german = loadDoc('reference/terms', 'de');
    const english = loadDoc('reference/terms');
    expect(german).not.toBeNull();
    expect(german).toEqual(english);
    expect(german?.sourcePath).toBe(
      'web/src/pages/DocsPage/content/reference/terms.md'
    );
  });

  it('resolves a redirect slug to the German translation of its target', () => {
    const doc = loadDoc('guides/introduction', 'de');
    expect(doc?.frontmatter.title).toBe('Was ist 2anki?');
  });
});

describe('hasDoc', () => {
  it('honours redirects', () => {
    expect(hasDoc('guides/getting-started')).toBe(true);
    expect(hasDoc('start-here/connect-notion')).toBe(true);
  });

  it('returns false for an unmapped slug', () => {
    expect(hasDoc('does/not/exist')).toBe(false);
  });
});
