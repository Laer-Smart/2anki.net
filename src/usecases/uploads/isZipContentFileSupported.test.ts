import { isZipContentFileSupported } from './isZipContentFileSupported';

describe('isZipContentFileSupported', () => {
  it.each([
    ['index.html'],
    ['notes.md'],
    ['notes.txt'],
    ['cards.csv'],
    ['reading.pdf'],
    ['sheet.xlsx'],
    ['essay.docx'],
    ['essay.doc'],
    ['README'],
  ])('accepts supported zip content %s', (fileName) => {
    expect(Boolean(isZipContentFileSupported(fileName))).toBe(true);
  });

  it.each([['virus.exe'], ['photo.png'], ['clip.mp4']])(
    'rejects unsupported zip content %s',
    (fileName) => {
      expect(Boolean(isZipContentFileSupported(fileName))).toBe(false);
    }
  );

  it('accepts a docx even though the xlsx check precedes it', () => {
    expect(Boolean(isZipContentFileSupported('report.docx'))).toBe(true);
  });
});
