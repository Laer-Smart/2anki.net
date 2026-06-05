import { describe, expect, it } from 'vitest';
import {
  docCount,
  popularResults,
  POPULAR_SLUGS,
  searchDocs,
  splitHighlight,
  tokenize,
} from './search';

describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('  Cloze   Cards ')).toEqual(['cloze', 'cards']);
  });

  it('returns an empty array for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('searchDocs', () => {
  it('indexes every sidebar doc', () => {
    expect(docCount()).toBeGreaterThan(30);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDocs('')).toEqual([]);
  });

  it('ranks a title match above body matches', () => {
    const results = searchDocs('image occlusion');
    expect(results[0].slug).toBe('cards/image-occlusion');
  });

  it('finds a doc by a body-only term', () => {
    const results = searchDocs('cloze');
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((r) => r.slug)).toContain('cards/card-types');
  });

  it('builds a snippet around the matched body term', () => {
    const results = searchDocs('cloze');
    const withSnippet = results.find((r) =>
      r.snippet.toLowerCase().includes('cloze')
    );
    expect(withSnippet).toBeDefined();
  });

  it('requires every term to match (AND semantics)', () => {
    expect(searchDocs('occlusion zzzznomatch')).toEqual([]);
  });

  it('returns nothing when no doc matches', () => {
    expect(searchDocs('zzzznomatch')).toEqual([]);
  });

  it('caps the number of results', () => {
    expect(searchDocs('the', 5).length).toBeLessThanOrEqual(5);
  });

  it('carries the group label as a breadcrumb', () => {
    const results = searchDocs('image occlusion');
    expect(results[0].group).toBe('Make better cards');
  });
});

describe('popularResults', () => {
  it('returns the popular slugs in order', () => {
    expect(popularResults().map((r) => r.slug)).toEqual(POPULAR_SLUGS);
  });
});

describe('splitHighlight', () => {
  it('marks the matched term and leaves the rest', () => {
    const segments = splitHighlight('Cloze cards', ['cloze']);
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['Cloze']);
    expect(segments.map((s) => s.text).join('')).toBe('Cloze cards');
  });

  it('returns a single unmarked segment when there are no terms', () => {
    expect(splitHighlight('Cloze cards', [])).toEqual([
      { text: 'Cloze cards', hit: false },
    ]);
  });
});
