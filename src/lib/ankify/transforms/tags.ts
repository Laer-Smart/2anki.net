const MAX_TAGS = 10;
const ALLOWED = /[A-Za-z0-9_:\-]/;

function sanitizeToken(raw: string): string {
  let out = '';
  for (const ch of raw) {
    if (ALLOWED.test(ch)) out += ch;
  }
  return out.replace(/:{3,}/g, '::');
}

export function parseTagInput(raw: string): string[] {
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];
  const tokens = trimmed.split(/\s+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const cleaned = sanitizeToken(token);
    if (cleaned.length === 0) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function mergeTags(
  source: readonly string[],
  extra: readonly string[]
): string[] {
  if (extra.length === 0) return [...source];
  const seen = new Set<string>(source);
  const out = [...source];
  for (const tag of extra) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}
