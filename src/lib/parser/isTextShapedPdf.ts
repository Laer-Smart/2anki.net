import type { PdfExtractionResult, PdfPage } from './extractPdfText';

export const TEXT_SHAPED_MIN_PAGE_COVERAGE = 0.8;
export const TEXT_SHAPED_MIN_AVG_CHARS_PER_PAGE = 200;

export const IMAGE_CARD_MIN_IMAGE_PAGE_COVERAGE = 0.9;
export const IMAGE_CARD_MAX_TEXT_LENGTH_VARIATION = 0.5;

function pageHasText(page: PdfPage): boolean {
  return page.text.trim().length > 0;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function looksLikeImageCardDeck(extraction: PdfExtractionResult): boolean {
  const pagesWithImage = extraction.pages.filter(
    (page) => page.imagePaintCount > 0
  ).length;
  const imagePageCoverage = pagesWithImage / extraction.pageCount;

  if (imagePageCoverage < IMAGE_CARD_MIN_IMAGE_PAGE_COVERAGE) {
    return false;
  }

  const textLengths = extraction.pages
    .filter(pageHasText)
    .map((page) => page.text.trim().length);

  return (
    coefficientOfVariation(textLengths) <= IMAGE_CARD_MAX_TEXT_LENGTH_VARIATION
  );
}

export function isTextShapedPdf(extraction: PdfExtractionResult): boolean {
  if (
    extraction.isDrmLocked ||
    extraction.needsCredential ||
    extraction.pageCount === 0
  ) {
    return false;
  }

  if (looksLikeImageCardDeck(extraction)) {
    return false;
  }

  const pageCoverage =
    extraction.pages.filter(pageHasText).length / extraction.pageCount;

  return (
    pageCoverage >= TEXT_SHAPED_MIN_PAGE_COVERAGE &&
    extraction.avgCharsPerPage >= TEXT_SHAPED_MIN_AVG_CHARS_PER_PAGE
  );
}
