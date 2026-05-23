import type { Heading } from './types';

const HEADING_LINE = /^(#{1,6})\s+(.+)$/;
const INLINE_MD = /[*_`~[\]]/g;

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(INLINE_MD, '')
    .trim();
}

export function detectMarkdown(source: string): Heading[] {
  const lines = source.split('\n');
  const headings: Heading[] = [];
  let currentHeading: { text: string; level: number } | null = null;
  const bodyLines: string[] = [];

  function flushHeading() {
    if (currentHeading == null) return;
    headings.push({
      text: currentHeading.text,
      level: currentHeading.level as Heading['level'],
      body: bodyLines.join('\n').trim(),
    });
  }

  for (const line of lines) {
    const match = HEADING_LINE.exec(line);
    if (match) {
      if (currentHeading != null) {
        flushHeading();
        bodyLines.length = 0;
      }
      currentHeading = {
        text: stripInlineMarkdown(match[2]),
        level: match[1].length,
      };
    } else {
      if (currentHeading != null) {
        bodyLines.push(line);
      }
    }
  }

  if (currentHeading != null) {
    flushHeading();
  }

  return headings;
}
