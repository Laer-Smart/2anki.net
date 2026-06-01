export const MAX_PARAGRAPH_SEGMENTS = 25;

const SURROUNDING_QUOTES = /^[«»"'“”„‘’\s]+|[«»"'“”„‘’\s]+$/g;

function stripSurroundingQuotes(text: string): string {
  return text.replace(SURROUNDING_QUOTES, '');
}

function collapseTrailingEnders(segment: string): string {
  return segment.replace(/([.!?])[.!?]+$/, '$1');
}

function splitOnSentenceEnders(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [])
    .map((segment) => collapseTrailingEnders(segment.trim()))
    .filter((segment) => segment.length > 0);
}

function splitOnClauseSeparators(text: string): string[] {
  return text
    .split(/[,;]+/)
    .map((segment) => segment.trim().replace(/[.!?]+$/, '').trim())
    .filter((segment) => segment.length > 0);
}

export default function splitParagraphSegments(text: string): string[] {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const cleaned = stripSurroundingQuotes(text).trim();
  if (!cleaned) {
    return [];
  }

  let segments = splitOnSentenceEnders(cleaned);
  if (segments.length < 2) {
    segments = splitOnClauseSeparators(cleaned);
  }

  if (segments.length < 2 || segments.length > MAX_PARAGRAPH_SEGMENTS) {
    return [];
  }

  return segments;
}
