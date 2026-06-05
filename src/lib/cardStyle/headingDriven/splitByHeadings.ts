import type { ChunkPayload, Heading } from './types';

const HTML_TAG = /<[^>]+>/g;

function stripHtml(text: string): string {
  return text.replace(HTML_TAG, '');
}

function findDeepestLevel(headings: Heading[]): number {
  return headings.reduce((max, h) => (h.level > max ? h.level : max), 1);
}

function headingHasContent(heading: Heading): boolean {
  return stripHtml(heading.body).trim().length > 0;
}

export function splitByHeadings(headings: Heading[]): ChunkPayload[] {
  if (headings.length === 0) return [];

  const deepest = findDeepestLevel(headings);
  const leafHeadings = headings.filter(
    (h) => h.level === deepest && headingHasContent(h)
  );

  const candidates =
    leafHeadings.length > 0 ? leafHeadings : headings.filter(headingHasContent);

  return candidates.map((heading) => ({
    anchor: stripHtml(heading.text).trim(),
    bodyChunk: heading.body,
  }));
}
