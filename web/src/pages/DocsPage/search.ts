import { getAllDocs } from './loader';
import { sidebar } from './sidebar';

export interface SearchResult {
  slug: string;
  title: string;
  group: string;
  snippet: string;
}

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

interface IndexEntry {
  slug: string;
  title: string;
  group: string;
  order: number;
  plainBody: string;
  titleLower: string;
  descriptionLower: string;
  groupLower: string;
  bodyLower: string;
}

const SNIPPET_LENGTH = 90;
const SNIPPET_LEAD = 30;
const MAX_RESULTS = 10;

export const POPULAR_SLUGS = [
  'start-here/connect-notion',
  'cards/card-types',
  'help/common-problems',
  'help/limits',
];

function stripMarkdown(body: string): string {
  return body
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/`([^`]{1,500})`/g, '$1')
    .replaceAll(/!\[[^\]]{0,300}]\([^)]{0,1000}\)/g, ' ')
    .replaceAll(/\[([^\]]{1,300})]\([^)]{0,1000}\)/g, '$1')
    .replaceAll(/<[^>]{1,500}>/g, ' ')
    .replaceAll(/^[>#\-*+]+\s?/gm, '')
    .replaceAll(/[*_~]/g, '')
    .replaceAll(/:::\w*/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function buildSidebarLookup(): Map<string, { title: string; group: string; order: number }> {
  const lookup = new Map<string, { title: string; group: string; order: number }>();
  let order = 0;
  for (const group of sidebar) {
    for (const item of group.items) {
      if (item.href) continue;
      lookup.set(item.slug, { title: item.label, group: group.label, order });
      order++;
    }
  }
  return lookup;
}

function buildIndex(): IndexEntry[] {
  const lookup = buildSidebarLookup();
  const entries: IndexEntry[] = [];
  for (const doc of getAllDocs()) {
    const meta = lookup.get(doc.slug);
    if (!meta) continue;
    const title = meta.title || doc.frontmatter.title || doc.slug;
    const description = doc.frontmatter.description ?? '';
    const plainBody = stripMarkdown(doc.body);
    entries.push({
      slug: doc.slug,
      title,
      group: meta.group,
      order: meta.order,
      plainBody,
      titleLower: title.toLowerCase(),
      descriptionLower: description.toLowerCase(),
      groupLower: meta.group.toLowerCase(),
      bodyLower: plainBody.toLowerCase(),
    });
  }
  return entries.sort((a, b) => a.order - b.order);
}

let cachedIndex: IndexEntry[] | null = null;

function getIndex(): IndexEntry[] {
  cachedIndex ??= buildIndex();
  return cachedIndex;
}

export function docCount(): number {
  return getIndex().length;
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function scoreTerm(entry: IndexEntry, term: string): number {
  if (entry.titleLower === term) return 200;
  if (entry.titleLower.startsWith(term)) return 140;
  if (entry.titleLower.includes(term)) return 100;
  if (entry.descriptionLower.includes(term)) return 50;
  if (entry.groupLower.includes(term)) return 30;
  if (entry.bodyLower.includes(term)) return 10;
  return 0;
}

function makeSnippet(entry: IndexEntry, terms: string[]): string {
  let position = -1;
  for (const term of terms) {
    const found = entry.bodyLower.indexOf(term);
    if (found >= 0 && (position < 0 || found < position)) position = found;
  }

  if (position < 0) return '';

  let start = Math.max(0, position - SNIPPET_LEAD);
  const space = entry.plainBody.lastIndexOf(' ', start);
  if (start > 0 && space > start - SNIPPET_LEAD) start = space + 1;

  const end = Math.min(entry.plainBody.length, start + SNIPPET_LENGTH);
  const slice = entry.plainBody.slice(start, end).trim();
  const prefix = start > 0 ? '…' : '';
  const suffix = end < entry.plainBody.length ? '…' : '';
  return `${prefix}${slice}${suffix}`;
}

export function searchDocs(query: string, limit = MAX_RESULTS): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const scored: Array<{ entry: IndexEntry; score: number }> = [];
  for (const entry of getIndex()) {
    let total = 0;
    let allMatched = true;
    for (const term of terms) {
      const termScore = scoreTerm(entry, term);
      if (termScore === 0) {
        allMatched = false;
        break;
      }
      total += termScore;
    }
    if (allMatched) scored.push({ entry, score: total });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order);

  return scored.slice(0, limit).map(({ entry }) => ({
    slug: entry.slug,
    title: entry.title,
    group: entry.group,
    snippet: makeSnippet(entry, terms),
  }));
}

export function popularResults(): SearchResult[] {
  const index = getIndex();
  const results: SearchResult[] = [];
  for (const slug of POPULAR_SLUGS) {
    const entry = index.find((item) => item.slug === slug);
    if (entry) {
      results.push({
        slug: entry.slug,
        title: entry.title,
        group: entry.group,
        snippet: '',
      });
    }
  }
  return results;
}

export function splitHighlight(text: string, terms: string[]): HighlightSegment[] {
  if (terms.length === 0 || text.length === 0) {
    return [{ text, hit: false }];
  }

  const lower = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    let from = lower.indexOf(term);
    while (from >= 0) {
      for (let i = from; i < from + term.length; i++) marks[i] = true;
      from = lower.indexOf(term, from + term.length);
    }
  }

  const segments: HighlightSegment[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marks[i] !== marks[start]) {
      segments.push({ text: text.slice(start, i), hit: marks[start] });
      start = i;
    }
  }
  return segments;
}
