import type { PdfExtractionResult } from './extractPdfText';

export const TEXT_SHAPED_MIN_PAGE_COVERAGE = 0.8;
export const TEXT_SHAPED_MIN_AVG_CHARS_PER_PAGE = 200;

export function isTextShapedPdf(extraction: PdfExtractionResult): boolean {
  if (
    extraction.isDrmLocked ||
    extraction.needsCredential ||
    extraction.pageCount === 0
  ) {
    return false;
  }

  const pagesWithText = extraction.pages.filter(
    (page) => page.text.trim().length > 0
  ).length;
  const pageCoverage = pagesWithText / extraction.pageCount;

  return (
    pageCoverage >= TEXT_SHAPED_MIN_PAGE_COVERAGE &&
    extraction.avgCharsPerPage >= TEXT_SHAPED_MIN_AVG_CHARS_PER_PAGE
  );
}
