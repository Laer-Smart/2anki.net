const DECK_PARENT = 'Notion Sync';
const DECK_TITLE_FALLBACK = 'Untitled';

const isDisallowedChar = (char: string): boolean =>
  char === '"' || char === '<' || char.charCodeAt(0) <= 0x1f;

const stripDisallowed = (raw: string): string =>
  Array.from(raw)
    .filter((char) => !isDisallowedChar(char))
    .join('');

const sanitizeDeckPath = (raw: string | null | undefined): string => {
  if (typeof raw !== 'string') return '';
  const stripped = stripDisallowed(raw).replace(/:{3,}/g, '::');
  return stripped
    .split('::')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('::');
};

const sanitizeDeckTitle = (title: string | null | undefined): string => {
  if (title == null) return DECK_TITLE_FALLBACK;
  const cleaned = title.split('::').join('').trim();
  return cleaned.length === 0 ? DECK_TITLE_FALLBACK : cleaned;
};

export const buildDeckName = (
  override: string | null | undefined,
  title: string | null | undefined
): string => {
  const overridePath = sanitizeDeckPath(override);
  if (overridePath.length > 0) return overridePath;
  return `${DECK_PARENT}::${sanitizeDeckTitle(title)}`;
};

export const isSelfOrDescendantDeck = (
  candidate: string,
  owned: string
): boolean => candidate === owned || candidate.startsWith(`${owned}::`);
