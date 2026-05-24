import { isEpubFile, isKindleClippingsFile } from './checks';

describe('isEpubFile', () => {
  it.each([
    'book.epub',
    'BOOK.EPUB',
    'My Reading List.epub',
    'subdir/path/title.epub',
  ])('returns truthy for %s', (name) => {
    expect(isEpubFile(name)).toBeTruthy();
  });

  it.each([
    'book.txt',
    'book.pdf',
    'book.epub.zip',
    'epub',
    '',
  ])('returns falsy for %s', (name) => {
    expect(isEpubFile(name)).toBeFalsy();
  });
});

describe('isKindleClippingsFile', () => {
  it.each([
    'My Clippings.txt',
    'my clippings.txt',
    'MY CLIPPINGS.TXT',
    'kindle/documents/My Clippings.txt',
    'kindle\\documents\\My Clippings.txt',
  ])('returns true for %s', (name) => {
    expect(isKindleClippingsFile(name)).toBe(true);
  });

  it.each([
    'MyClippings.txt',
    'My Clippings.csv',
    'My Clippings (2).txt',
    'clippings.txt',
    'Notes.txt',
    '',
  ])('returns false for %s', (name) => {
    expect(isKindleClippingsFile(name)).toBe(false);
  });
});
