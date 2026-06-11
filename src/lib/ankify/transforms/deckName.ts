import { sanitizeDeckPath } from './tags';

const DECK_PARENT = 'Notion Sync';
const DECK_TITLE_FALLBACK = 'Untitled';

const sanitizeDeckTitle = (title: string | null | undefined): string => {
  if (title == null) {
    return DECK_TITLE_FALLBACK;
  }
  const cleaned = title.split('::').join('').trim();
  if (cleaned.length === 0) {
    return DECK_TITLE_FALLBACK;
  }
  return cleaned;
};

export const buildDeckName = (
  override: string | null | undefined,
  title: string | null | undefined
): string => {
  const overridePath = sanitizeDeckPath(override);
  if (overridePath.length > 0) {
    return overridePath;
  }
  return `${DECK_PARENT}::${sanitizeDeckTitle(title)}`;
};
