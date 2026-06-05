import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { Heading } from './types';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function headingLevel(tagName: string): Heading['level'] {
  const n = Number.parseInt(tagName.slice(1), 10);
  if (n >= 1 && n <= 6) return n as Heading['level'];
  return 1;
}

function collectBodyUntilNextHeading(
  $: cheerio.CheerioAPI,
  headingEl: AnyNode
): string {
  const parts: string[] = [];
  let sibling = $(headingEl).next();
  while (sibling.length > 0 && !sibling.is(HEADING_SELECTOR)) {
    const text = sibling.text().trim();
    if (text.length > 0) parts.push(text);
    sibling = sibling.next();
  }
  return parts.join('\n');
}

export function detectHtml(source: string): Heading[] {
  const $ = cheerio.load(source);
  const headings: Heading[] = [];

  $(HEADING_SELECTOR).each((_, el) => {
    const text = $(el).text().trim();
    if (text.length === 0) return;
    headings.push({
      text,
      level: headingLevel(el.tagName.toLowerCase()),
      body: collectBodyUntilNextHeading($, el),
    });
  });

  return headings;
}
