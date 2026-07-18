import { describe, expect, it } from 'vitest';
import {
  findAdjacent,
  findGroupForSlug,
  localizeGroupLabel,
  redirects,
  sidebar,
} from './sidebar';

describe('sidebar', () => {
  it('every internal item maps to a unique slug', () => {
    const slugs = sidebar
      .flatMap((group) => group.items)
      .filter((item) => !item.href)
      .map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('external items use href and skip slug routing', () => {
    const externals = sidebar
      .flatMap((group) => group.items)
      .filter((item) => item.href);
    expect(externals.length).toBeGreaterThan(0);
    for (const item of externals) {
      expect(item.href?.startsWith('http')).toBe(true);
    }
  });
});

describe('findAdjacent', () => {
  it('returns next-only for the first item', () => {
    const { prev, next } = findAdjacent('start-here/what-is-2anki');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('start-here/connect-notion');
  });

  it('returns prev and next for a middle item', () => {
    const { prev, next } = findAdjacent('start-here/connect-notion');
    expect(prev?.slug).toBe('start-here/what-is-2anki');
    expect(next?.slug).toBe('start-here/upload-a-file');
  });

  it('skips external items when finding adjacent', () => {
    const { prev, next } = findAdjacent('reference/terms');
    expect(prev?.slug).toBe('reference/privacy');
    expect(next?.slug).toBe('links/community');
  });
});

describe('findGroupForSlug', () => {
  it('returns the group the slug belongs to', () => {
    expect(findGroupForSlug('cards/card-options')?.label).toBe(
      'Make better cards'
    );
    expect(findGroupForSlug('sync/how-it-works')?.label).toBe(
      'Sync with Notion'
    );
  });

  it('returns null for an unknown slug', () => {
    expect(findGroupForSlug('does/not/exist')).toBeNull();
  });
});

describe('redirects', () => {
  it('redirect targets all resolve to a real sidebar slug', () => {
    const validSlugs = new Set(
      sidebar.flatMap((group) =>
        group.items.filter((item) => !item.href).map((item) => item.slug)
      )
    );
    for (const target of Object.values(redirects)) {
      expect(validSlugs.has(target)).toBe(true);
    }
  });

  it('covers the legacy slugs the audit called out', () => {
    expect(redirects['guides/getting-started']).toBe(
      'start-here/connect-notion'
    );
    expect(redirects['features/notion-support']).toBe('cards/notion-blocks');
    expect(redirects['troubleshooting/limits']).toBe('help/limits');
    expect(redirects['advanced/strategy']).toBeDefined();
    expect(redirects['misc/privacy-policy']).toBe('reference/privacy');
  });

  it('translates every group header for German', () => {
    for (const group of sidebar) {
      expect(localizeGroupLabel(group.label, 'de')).not.toBe('');
    }
    expect(localizeGroupLabel('Start here', 'de')).toBe("Los geht's");
    expect(localizeGroupLabel('Make better cards', 'de')).toBe(
      'Bessere Karten erstellen'
    );
  });

  it('leaves group headers in English for English and unknown locales', () => {
    expect(localizeGroupLabel('Start here', 'en')).toBe('Start here');
    expect(localizeGroupLabel('Start here', undefined)).toBe('Start here');
    expect(localizeGroupLabel('Reference', 'fr')).toBe('Reference');
  });
});
