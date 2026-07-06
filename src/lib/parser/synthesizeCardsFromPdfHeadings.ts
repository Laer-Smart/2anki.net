import type { PdfCard, PdfPage } from './synthesizeCardsFromPdf';

const HEADING_MAX_CHARS = 60;
const SENTENCE_TAIL = /[.,;]$/;
const LIST_MARKER = /^(?:[-*•●○◦▪‣·]|\d{1,3}[.)])\s/;
const TERMINAL_PUNCTUATION = /[.!?:;]$/;

function startsLowercase(line: string): boolean {
  const first = line.charAt(0);
  return first !== first.toUpperCase();
}

function isWrappedContinuation(previousLine: string | undefined): boolean {
  return (
    previousLine != null &&
    previousLine.length >= HEADING_MAX_CHARS &&
    !TERMINAL_PUNCTUATION.test(previousLine)
  );
}

function isHeadingLine(
  line: string,
  nextLine: string | undefined,
  previousLine: string | undefined
): boolean {
  return (
    line.length < HEADING_MAX_CHARS &&
    nextLine != null &&
    nextLine.length > line.length &&
    !SENTENCE_TAIL.test(line) &&
    !LIST_MARKER.test(line) &&
    !startsLowercase(line) &&
    !isWrappedContinuation(previousLine)
  );
}

export function synthesizeCardsFromPdfHeadings(
  pages: PdfPage[],
  deckName: string
): PdfCard[] {
  const tag = deckName.replace(/\s+/g, '_');
  const lines = pages
    .flatMap((page) => page.text.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cards: PdfCard[] = [];
  let front: string | null = null;
  let body: string[] = [];

  const flushCard = () => {
    if (front != null && body.length > 0) {
      cards.push({ front, back: body.join('\n'), tags: [tag] });
    }
  };

  lines.forEach((line, index) => {
    if (isHeadingLine(line, lines[index + 1], lines[index - 1])) {
      flushCard();
      front = line;
      body = [];
    } else if (front != null) {
      body.push(line);
    }
  });
  flushCard();

  return cards;
}
