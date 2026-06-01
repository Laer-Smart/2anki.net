export const MAX_PARAGRAPH_SEGMENTS = 25;

const QUOTE_CHARS = new Set(['«', '»', '"', "'", '“', '”', '„', '‘', '’']);

function isStrippable(ch: string): boolean {
  return QUOTE_CHARS.has(ch) || /\s/.test(ch);
}

function isSentenceEnder(ch: string): boolean {
  return ch === '.' || ch === '!' || ch === '?';
}

function stripSurroundingQuotes(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && isStrippable(text[start])) start++;
  while (end > start && isStrippable(text[end - 1])) end--;
  return text.slice(start, end);
}

function stripTrailingEnders(text: string): string {
  let end = text.length;
  while (end > 0 && isSentenceEnder(text[end - 1])) end--;
  return text.slice(0, end);
}

// Collapse a trailing run of sentence enders down to its first character,
// e.g. "Wait..." -> "Wait." A single trailing ender is left unchanged.
function collapseTrailingEnders(segment: string): string {
  let end = segment.length;
  while (end > 0 && isSentenceEnder(segment[end - 1])) end--;
  if (end === segment.length) return segment;
  return segment.slice(0, end + 1);
}

// Split into "sentence + its trailing punctuation" runs. Mirrors the previous
// /[^.!?]+[.!?]+/g matcher: leading enders are skipped, and a trailing run of
// non-enders with no terminating punctuation is dropped.
function splitOnSentenceEnders(text: string): string[] {
  const out: string[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    while (i < n && isSentenceEnder(text[i])) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !isSentenceEnder(text[i])) i++;
    if (i >= n) break;
    while (i < n && isSentenceEnder(text[i])) i++;
    out.push(text.slice(start, i));
  }
  return out
    .map((segment) => collapseTrailingEnders(segment.trim()))
    .filter((segment) => segment.length > 0);
}

function splitOnClauseSeparators(text: string): string[] {
  return text
    .split(/[,;]+/)
    .map((segment) => stripTrailingEnders(segment.trim()).trim())
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
