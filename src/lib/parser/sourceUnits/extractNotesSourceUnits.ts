import { SourceUnit } from './SourceUnit';

type InputFormat = 'md' | 'html';

const HEADING_MD = /^#{1,6}\s+(.+)$/m;

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"');
}

function buildUnit(index: number, rawText: string): SourceUnit {
  return {
    id: `section-${index}`,
    visibleText: rawText.trim(),
    speakerNotes: '',
    role: 'body',
  };
}

function stripMarkdownHeadingPrefix(line: string): string {
  const match = /^#{1,6}\s+(.+)$/.exec(line);
  return match ? match[1] : line;
}

function splitMarkdownByHeadings(text: string): string[] {
  const lines = text.split('\n');
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (HEADING_MD.test(line) && current.length > 0) {
      sections.push(current.join('\n'));
      current = [stripMarkdownHeadingPrefix(line)];
    } else if (HEADING_MD.test(line)) {
      current = [stripMarkdownHeadingPrefix(line)];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0 && current.join('').trim()) {
    sections.push(current.join('\n'));
  }

  return sections;
}

function splitHtmlByHeadings(html: string): string[] {
  const parts = html.split(/<h[1-6]\b[^>]*>/i);
  const sections: string[] = [];

  for (const part of parts) {
    const closingMatch = /<\/h[1-6]>/i.exec(part);
    if (closingMatch) {
      const headingText = stripHtmlTags(
        part.substring(0, closingMatch.index + closingMatch[0].length)
      );
      const rest = part.substring(closingMatch.index + closingMatch[0].length);
      const combined = headingText + '\n' + stripHtmlTags(rest);
      if (combined.trim()) {
        sections.push(combined);
      }
    } else if (part.trim()) {
      sections.push(stripHtmlTags(part));
    }
  }

  return sections;
}

export function extractNotesSourceUnits(
  content: string,
  format: InputFormat
): SourceUnit[] {
  if (!content.trim()) {
    return [];
  }

  let rawSections: string[];

  if (format === 'html') {
    const hasHeadings = /<h[1-6]\b/i.test(content);
    rawSections = hasHeadings
      ? splitHtmlByHeadings(content)
      : [stripHtmlTags(content)];
  } else {
    const hasHeadings = HEADING_MD.test(content);
    rawSections = hasHeadings ? splitMarkdownByHeadings(content) : [content];
  }

  return rawSections.filter((s) => s.trim()).map((s, i) => buildUnit(i + 1, s));
}
