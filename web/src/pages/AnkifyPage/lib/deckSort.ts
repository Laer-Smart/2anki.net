export type DeckSortKey = 'status' | 'last-synced' | 'name';

export const DECK_SORT_DEFAULT: DeckSortKey = 'status';

const DECK_SORT_KEYS: ReadonlySet<string> = new Set<DeckSortKey>([
  'status',
  'last-synced',
  'name',
]);

const DECK_SORT_STORAGE_KEY = 'ankify-deck-sort';

const UNTITLED_TITLE = 'Untitled page';

export interface DeckSortRow {
  readonly notion_page_title: string | null | undefined;
  readonly last_synced_at: string | null | undefined;
  readonly last_error: string | null | undefined;
}

type DeckSortStatus = 'error' | 'syncing' | 'offline' | 'success';

const STATUS_RANK: Record<DeckSortStatus, number> = {
  error: 0,
  syncing: 1,
  offline: 2,
  success: 3,
};

const isCalmOfflineError = (lastError: string | null | undefined): boolean =>
  lastError != null && lastError.startsWith('Anki client offline');

const statusOf = (row: DeckSortRow): DeckSortStatus => {
  if (isCalmOfflineError(row.last_error)) return 'offline';
  if (row.last_error != null) return 'error';
  return 'success';
};

const syncedTime = (row: DeckSortRow): number | null => {
  if (row.last_synced_at == null || row.last_synced_at.length === 0)
    return null;
  const parsed = new Date(row.last_synced_at).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const displayTitle = (row: DeckSortRow): string => {
  const trimmed = row.notion_page_title?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : UNTITLED_TITLE;
};

const compareOldestSyncedFirst = (a: DeckSortRow, b: DeckSortRow): number => {
  const timeA = syncedTime(a);
  const timeB = syncedTime(b);
  if (timeA == null && timeB == null) return 0;
  if (timeA == null) return 1;
  if (timeB == null) return -1;
  return timeA - timeB;
};

const compareNewestSyncedFirst = (a: DeckSortRow, b: DeckSortRow): number => {
  const timeA = syncedTime(a);
  const timeB = syncedTime(b);
  if (timeA == null && timeB == null) return 0;
  if (timeA == null) return 1;
  if (timeB == null) return -1;
  return timeB - timeA;
};

const compareName = (a: DeckSortRow, b: DeckSortRow): number => {
  const titleA = displayTitle(a);
  const titleB = displayTitle(b);
  const aUntitled = titleA === UNTITLED_TITLE;
  const bUntitled = titleB === UNTITLED_TITLE;
  if (aUntitled && bUntitled) return 0;
  if (aUntitled) return 1;
  if (bUntitled) return -1;
  return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
};

const compareStatus = (a: DeckSortRow, b: DeckSortRow): number => {
  const rankDiff = STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
  if (rankDiff !== 0) return rankDiff;
  return compareOldestSyncedFirst(a, b);
};

const comparatorFor = (
  key: DeckSortKey
): ((a: DeckSortRow, b: DeckSortRow) => number) => {
  if (key === 'name') return compareName;
  if (key === 'last-synced') return compareNewestSyncedFirst;
  return compareStatus;
};

export const sortDecks = <T extends DeckSortRow>(
  rows: readonly T[],
  key: DeckSortKey
): T[] => {
  const comparator = comparatorFor(key);
  return [...rows].sort(comparator);
};

export const isDeckSortKey = (value: unknown): value is DeckSortKey =>
  typeof value === 'string' && DECK_SORT_KEYS.has(value);

export const readStoredDeckSort = (): DeckSortKey => {
  try {
    const stored = globalThis.localStorage?.getItem(DECK_SORT_STORAGE_KEY);
    return isDeckSortKey(stored) ? stored : DECK_SORT_DEFAULT;
  } catch {
    return DECK_SORT_DEFAULT;
  }
};

export const writeStoredDeckSort = (key: DeckSortKey): void => {
  try {
    globalThis.localStorage?.setItem(DECK_SORT_STORAGE_KEY, key);
  } catch {}
};
