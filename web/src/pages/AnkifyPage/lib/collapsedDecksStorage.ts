const STORAGE_KEY = '2anki-ankify-collapsed-decks';

export function getStoredCollapsedDecks(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw == null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function setStoredCollapsedDecks(collapsed: Set<string>): void {
  globalThis.localStorage?.setItem(
    STORAGE_KEY,
    JSON.stringify(Array.from(collapsed))
  );
}
