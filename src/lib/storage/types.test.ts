import { isFileNameEqual } from './types';
import type { File } from '../zip/zip';

function file(name: string): File {
  return { name };
}

describe('isFileNameEqual', () => {
  it.each([
    ['plain UTF-8 umlaut', 'Speicheldrüsen.zip', 'Speicheldrüsen.zip'],
    ['CJK characters', '漢字.zip', '漢字.zip'],
    ['Cyrillic', 'Здравствуйте.zip', 'Здравствуйте.zip'],
    ['accented', 'café.html', 'café.html'],
    ['emoji', '📚.zip', '📚.zip'],
  ])('%s: matches when both sides are identical', (_label, fileName, name) => {
    expect(isFileNameEqual(file(fileName), name)).toBe(true);
  });

  it('matches when the zip entry is UTF-8 but the name arrived double-encoded as latin1', () => {
    expect(
      isFileNameEqual(file('Speicheldrüsen.zip'), 'SpeicheldrÃ¼sen.zip')
    ).toBe(true);
  });

  it('matches when the file name is double-encoded but the name is clean UTF-8', () => {
    expect(
      isFileNameEqual(file('SpeicheldrÃ¼sen.zip'), 'Speicheldrüsen.zip')
    ).toBe(true);
  });

  it('does not throw and returns false for a truly malformed percent-encoded name', () => {
    expect(() =>
      isFileNameEqual(file('normal.zip'), 'bad%E0%A4%A.zip')
    ).not.toThrow();
    expect(isFileNameEqual(file('normal.zip'), 'bad%E0%A4%A.zip')).toBe(false);
  });

  it('returns false for clearly different names', () => {
    expect(isFileNameEqual(file('one.zip'), 'two.zip')).toBe(false);
  });
});
