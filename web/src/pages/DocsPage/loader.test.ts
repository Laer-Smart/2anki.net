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
