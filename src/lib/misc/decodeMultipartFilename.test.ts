import { decodeMultipartFilename } from './decodeMultipartFilename';

describe('decodeMultipartFilename', () => {
  it('recovers Chinese characters from latin1-decoded UTF-8 bytes', () => {
    const mojibake = Buffer.from('中文.md', 'utf8').toString('latin1');
    expect(decodeMultipartFilename(mojibake)).toBe('中文.md');
  });

  it('leaves ASCII filenames unchanged', () => {
    expect(decodeMultipartFilename('Biology.md')).toBe('Biology.md');
  });

  it('handles accented characters', () => {
    const mojibake = Buffer.from('résumé.html', 'utf8').toString('latin1');
    expect(decodeMultipartFilename(mojibake)).toBe('résumé.html');
  });

  it('handles Japanese filenames', () => {
    const mojibake = Buffer.from('日本語.zip', 'utf8').toString('latin1');
    expect(decodeMultipartFilename(mojibake)).toBe('日本語.zip');
  });
});
