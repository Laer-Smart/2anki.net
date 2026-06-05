import { slugifyTitle } from './slugifyTitle';

describe('slugifyTitle', () => {
  it('converts a known title to a lowercase hyphenated slug', () => {
    expect(slugifyTitle('Anatomy of the Heart')).toBe('anatomy-of-the-heart');
  });

  it('returns null for an empty string', () => {
    expect(slugifyTitle('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(slugifyTitle('   ')).toBeNull();
  });

  it('strips diacritics and converts to ASCII', () => {
    expect(slugifyTitle('Hépatologie')).toBe('hepatologie');
  });

  it('removes punctuation other than hyphens', () => {
    expect(slugifyTitle('Chapter 1: Introduction!')).toBe(
      'chapter-1-introduction'
    );
  });

  it('collapses multiple spaces and hyphens into a single hyphen', () => {
    expect(slugifyTitle('A  B   C')).toBe('a-b-c');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugifyTitle('!Hello World!')).toBe('hello-world');
  });
});
