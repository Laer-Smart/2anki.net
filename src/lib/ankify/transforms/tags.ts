const DECK_PATH_DISALLOWED = /[\u0000-\u001f"<]/g;

export function sanitizeDeckPath(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const stripped = raw
    .replace(DECK_PATH_DISALLOWED, '')
    .replace(/:{3,}/g, '::');
  const segments = stripped
    .split('::')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  return segments.join('::');
}
