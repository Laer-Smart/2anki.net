import { isTextShapedPdf } from './isTextShapedPdf';
import type { PdfExtractionResult } from './extractPdfText';

function makeExtraction(
  overrides: Partial<PdfExtractionResult> = {}
): PdfExtractionResult {
  const pages = Array.from({ length: 10 }, () => ({
    text: 'A line of real extractable study text on this page.',
  }));
  return {
    pages,
    pageCount: 10,
    avgCharsPerPage: 400,
    isDrmLocked: false,
    needsCredential: false,
    ...overrides,
  };
}

describe('isTextShapedPdf', () => {
  it('returns true when every page has text and the average is high', () => {
    expect(isTextShapedPdf(makeExtraction())).toBe(true);
  });

  it('returns true at exactly 80% page coverage', () => {
    const pages = [
      ...Array.from({ length: 8 }, () => ({ text: 'real text' })),
      { text: '' },
      { text: '   ' },
    ];
    expect(isTextShapedPdf(makeExtraction({ pages }))).toBe(true);
  });

  it('returns false below 80% page coverage', () => {
    const pages = [
      ...Array.from({ length: 7 }, () => ({ text: 'real text' })),
      { text: '' },
      { text: '' },
      { text: '' },
    ];
    expect(isTextShapedPdf(makeExtraction({ pages }))).toBe(false);
  });

  it('returns true at exactly 200 average chars per page', () => {
    expect(isTextShapedPdf(makeExtraction({ avgCharsPerPage: 200 }))).toBe(
      true
    );
  });

  it('returns false below 200 average chars per page', () => {
    expect(isTextShapedPdf(makeExtraction({ avgCharsPerPage: 199 }))).toBe(
      false
    );
  });

  it('returns false for a DRM-locked PDF', () => {
    expect(isTextShapedPdf(makeExtraction({ isDrmLocked: true }))).toBe(false);
  });

  it('returns false when a credential is still needed', () => {
    expect(isTextShapedPdf(makeExtraction({ needsCredential: true }))).toBe(
      false
    );
  });

  it('returns false for an empty PDF', () => {
    expect(
      isTextShapedPdf(
        makeExtraction({ pages: [], pageCount: 0, avgCharsPerPage: 0 })
      )
    ).toBe(false);
  });
});
