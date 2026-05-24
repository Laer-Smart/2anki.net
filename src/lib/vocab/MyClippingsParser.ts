/**
 * Parses a Kindle `My Clippings.txt` file into structured highlight entries.
 *
 * The file is a UTF-8 text file where each entry is delimited by `==========`.
 * Each entry has four logical lines:
 *   1. `Book Title (Author Name)`           — book + author
 *   2. `- <type> at/on <location> | Added on <date>`  — metadata
 *   3. (blank)
 *   4. The highlighted passage (one or more lines)
 *
 * Kindle ships the metadata line in the device's UI language, so we accept
 * EN, DE, ES, and FR. Bookmarks (no body text) are skipped; notes and
 * highlights are both treated as highlights for vocab-deck purposes.
 */

export interface ClippingEntry {
  readonly book: string;
  readonly author: string;
  readonly highlight: string;
  readonly date: string;
  readonly locale: 'en' | 'de' | 'es' | 'fr';
}

const ENTRY_DELIMITER = /^=+$/m;
const BOM = /^﻿/;

interface LocaleSpec {
  readonly code: ClippingEntry['locale'];
  readonly highlight: readonly string[];
  readonly note: readonly string[];
  readonly bookmark: readonly string[];
}

const LOCALES: readonly LocaleSpec[] = [
  {
    code: 'en',
    highlight: ['Highlight'],
    note: ['Note'],
    bookmark: ['Bookmark'],
  },
  {
    code: 'de',
    highlight: ['Markierung'],
    note: ['Notiz'],
    bookmark: ['Lesezeichen'],
  },
  {
    code: 'es',
    highlight: ['subrayado'],
    note: ['nota'],
    bookmark: ['marcador'],
  },
  {
    code: 'fr',
    highlight: ['surlignement', 'surlignage'],
    note: ['note'],
    bookmark: ['signet'],
  },
];

function detectLocale(metaLine: string): {
  locale: ClippingEntry['locale'];
  kind: 'highlight' | 'note' | 'bookmark';
} | null {
  const lower = metaLine.toLowerCase();
  for (const spec of LOCALES) {
    if (spec.bookmark.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { locale: spec.code, kind: 'bookmark' };
    }
    if (spec.highlight.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { locale: spec.code, kind: 'highlight' };
    }
    if (spec.note.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { locale: spec.code, kind: 'note' };
    }
  }
  return null;
}

function parseBookHeader(line: string): { book: string; author: string } {
  // "Title (Author Name)" — author is the last parenthesised group.
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(line);
  if (match) {
    return { book: match[1].trim(), author: match[2].trim() };
  }
  return { book: line.trim(), author: '' };
}

function extractDate(metaLine: string): string {
  // Pull everything after the last `|` separator; that's where the date sits
  // in every locale Kindle ships.
  const pipe = metaLine.lastIndexOf('|');
  if (pipe === -1) return '';
  return metaLine.slice(pipe + 1).trim();
}

export interface ParseResult {
  readonly entries: readonly ClippingEntry[];
  readonly skipped: number;
}

export function parseMyClippings(input: string): ParseResult {
  const normalized = input.replace(BOM, '').replace(/\r\n/g, '\n');
  const blocks = normalized.split(ENTRY_DELIMITER);
  const entries: ClippingEntry[] = [];
  let skipped = 0;

  for (const raw of blocks) {
    const block = raw.trim();
    if (block.length === 0) continue;

    const lines = block.split(/\r?\n/);
    if (lines.length < 2) {
      skipped += 1;
      continue;
    }

    const header = parseBookHeader(lines[0]);
    const detection = detectLocale(lines[1]);
    if (detection == null || detection.kind === 'bookmark') {
      skipped += 1;
      continue;
    }

    const body = lines
      .slice(2)
      .join('\n')
      .replace(/^\s+|\s+$/g, '');

    if (body.length === 0) {
      skipped += 1;
      continue;
    }

    entries.push({
      book: header.book,
      author: header.author,
      highlight: body,
      date: extractDate(lines[1]),
      locale: detection.locale,
    });
  }

  return { entries, skipped };
}

export function groupByBook(
  entries: readonly ClippingEntry[]
): ReadonlyMap<string, readonly ClippingEntry[]> {
  const groups = new Map<string, ClippingEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.book);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(entry.book, [entry]);
    }
  }
  return groups;
}
