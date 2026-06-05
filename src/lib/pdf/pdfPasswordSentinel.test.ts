import {
  buildPdfPasswordSentinel,
  isPdfPasswordSentinel,
  parsePdfPasswordSentinel,
} from './pdfPasswordSentinel';

describe('pdfPasswordSentinel', () => {
  it('round-trips a plain filename', () => {
    const sentinel = buildPdfPasswordSentinel('Biochemistry-Ch4.pdf');
    expect(parsePdfPasswordSentinel(sentinel)).toBe('Biochemistry-Ch4.pdf');
  });

  it('preserves filenames containing a colon', () => {
    const sentinel = buildPdfPasswordSentinel('test:hidden.pdf');
    expect(parsePdfPasswordSentinel(sentinel)).toBe('test:hidden.pdf');
  });

  it('preserves filenames containing the literal prefix', () => {
    const sentinel = buildPdfPasswordSentinel(
      'PDF_NEEDS_PASSWORD-research.pdf'
    );
    expect(parsePdfPasswordSentinel(sentinel)).toBe(
      'PDF_NEEDS_PASSWORD-research.pdf'
    );
  });

  it('returns null for unrelated messages', () => {
    expect(parsePdfPasswordSentinel('Some other error')).toBeNull();
    expect(
      parsePdfPasswordSentinel('PDF_NEEDS_PASSWORD:legacy.pdf')
    ).toBeNull();
  });

  it('detects sentinel messages via isPdfPasswordSentinel', () => {
    expect(isPdfPasswordSentinel(buildPdfPasswordSentinel('a.pdf'))).toBe(true);
    expect(isPdfPasswordSentinel('Some other error')).toBe(false);
  });
});
