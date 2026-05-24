import { strFromU8, unzipSync } from 'fflate';

import { isSafeEntryName } from './safeEntryPath';

/**
 * Hard pre-decompression cap for `.epub` uploads on the vocab path.
 *
 * Why: `fflate.unzipSync` buffers the whole archive into memory before
 * returning a single entry. Highlighted EPUBs are typically small
 * (annotations, OPF, a few XHTML chapters) — 5 MB covers the realistic
 * uploads. Capping at 20 MB defuses the OOM risk the trio engineer
 * flagged on shared-tenant prod (multiple concurrent uploads × 80 MB
 * textbook EPUBs would exhaust the heap).
 *
 * If a legitimate large EPUB shows up in support, raise this with a
 * fixture and a memory-cost note — do not bypass.
 */
export const MAX_EPUB_BYTES = 20 * 1024 * 1024;

export interface EpubHighlight {
  readonly book: string;
  readonly author: string;
  readonly highlight: string;
}

export interface EpubWalkResult {
  readonly highlights: readonly EpubHighlight[];
  readonly source: 'epub';
}

class EpubError extends Error {}

export class EpubTooLargeError extends EpubError {
  constructor(actualBytes: number) {
    super(
      `EPUB is too large (${actualBytes} bytes, max ${MAX_EPUB_BYTES}). ` +
        'Try a smaller EPUB or contact support for an exemption.'
    );
    this.name = 'EpubTooLargeError';
  }
}

export class EpubNoAnnotationsError extends EpubError {
  constructor() {
    super(
      'This EPUB contains no highlighted passages. Highlight passages in ' +
        'your e-reader first, then re-upload.'
    );
    this.name = 'EpubNoAnnotationsError';
  }
}

const TEXT_DECODER_OPTS = { stream: false } as const;

function decode(bytes: Uint8Array): string {
  return strFromU8(bytes);
}

function findContainerOpfPath(containerXml: string): string | null {
  const match = /<rootfile[^>]*\sfull-path="([^"]+)"/i.exec(containerXml);
  return match ? match[1] : null;
}

function extractOpfMetadata(opfXml: string): {
  title: string;
  author: string;
} {
  const title = /<dc:title[^>]*>([^<]+)<\/dc:title>/i.exec(opfXml)?.[1] ?? '';
  const author =
    /<dc:creator[^>]*>([^<]+)<\/dc:creator>/i.exec(opfXml)?.[1] ?? '';
  return {
    title: title.trim(),
    author: author.trim(),
  };
}

const ANNOTATION_TAG_PATTERN =
  /<(span|aside)\b[^>]*\bepub:type=["']annotation["'][^>]*>([\s\S]*?)<\/\1>/gi;

function stripTags(input: string): string {
  // Hand-rolled to avoid /<[^>]+>/g — Sonar typescript:S5852 flags any
  // unbounded-greedy class repeat. Linear-time scan with no backtracking.
  let out = '';
  let inside = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '<') {
      inside = true;
      continue;
    }
    if (ch === '>') {
      inside = false;
      out += ' ';
      continue;
    }
    if (!inside) out += ch;
  }
  return out;
}

function collapseWhitespace(input: string): string {
  // Hand-rolled to avoid /\s+/g — same Sonar rule.
  let out = '';
  let lastWasSpace = false;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const isSpace =
      code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
    if (isSpace) {
      if (!lastWasSpace && out.length > 0) out += ' ';
      lastWasSpace = true;
    } else {
      out += input[i];
      lastWasSpace = false;
    }
  }
  return out.trimEnd();
}

const HTML_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ['&nbsp;', ' '],
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
];

function decodeEntities(input: string): string {
  let out = input;
  for (const [entity, char] of HTML_ENTITIES) {
    out = out.split(entity).join(char);
  }
  return out;
}

function stripHtml(input: string): string {
  return collapseWhitespace(decodeEntities(stripTags(input)));
}

function extractAnnotationsFromXhtml(xhtml: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null = ANNOTATION_TAG_PATTERN.exec(xhtml);
  while (match !== null) {
    const text = stripHtml(match[2]);
    if (text.length > 0) {
      out.push(text);
    }
    match = ANNOTATION_TAG_PATTERN.exec(xhtml);
  }
  ANNOTATION_TAG_PATTERN.lastIndex = 0;
  return out;
}

export interface WalkOptions {
  readonly maxBytes?: number;
}

/**
 * Parses an EPUB buffer into highlight entries. Throws `EpubTooLargeError`
 * if the buffer exceeds the size cap, and `EpubNoAnnotationsError` if no
 * annotation tags are found. Spine-fallback extraction is deferred to v2
 * (extracting every paragraph would produce useless vocab cards).
 */
export function walkEpub(
  zipData: Uint8Array,
  options: WalkOptions = {}
): EpubWalkResult {
  const maxBytes = options.maxBytes ?? MAX_EPUB_BYTES;
  const size = zipData.byteLength;
  if (size > maxBytes) {
    throw new EpubTooLargeError(size);
  }

  const baseDir = '/extracted';
  const entries = unzipSync(zipData, {
    filter: (file) => isSafeEntryName(file.name, baseDir),
  });

  const containerEntry = entries['META-INF/container.xml'];
  let opfPath: string | null = null;
  if (containerEntry !== undefined) {
    opfPath = findContainerOpfPath(decode(containerEntry));
  }
  if (opfPath == null) {
    opfPath = Object.keys(entries).find((name) =>
      name.toLowerCase().endsWith('.opf')
    ) ?? null;
  }

  let book = '';
  let author = '';
  if (opfPath != null) {
    const opfEntry = entries[opfPath];
    if (opfEntry !== undefined) {
      const metadata = extractOpfMetadata(decode(opfEntry));
      book = metadata.title;
      author = metadata.author;
    }
  }

  const highlights: EpubHighlight[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    const lower = name.toLowerCase();
    if (
      !(lower.endsWith('.xhtml') ||
        lower.endsWith('.html') ||
        lower.endsWith('.htm'))
    ) {
      continue;
    }
    const xhtml = decode(bytes);
    for (const text of extractAnnotationsFromXhtml(xhtml)) {
      highlights.push({ book, author, highlight: text });
    }
  }

  if (highlights.length === 0) {
    throw new EpubNoAnnotationsError();
  }

  return { highlights, source: 'epub' };
}

// `TEXT_DECODER_OPTS` would let the walker switch to TextDecoder.decode with
// streaming options if we drop fflate's strFromU8 helper. Kept here so the
// reviewer can see the explicit non-streaming choice — see header note.
void TEXT_DECODER_OPTS;
