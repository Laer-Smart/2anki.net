export const TOP_LEVEL_PAGES_CACHE_TTL_MS = 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  owner: number;
}

const store = new Map<string, CacheEntry<unknown>>();

function buildKey(owner: number, query: string): string {
  return `${owner}:${query.trim().toLowerCase()}`;
}

export function getTopLevelPagesCache<T>(
  owner: number,
  query: string
): T | undefined {
  const key = buildKey(owner, query);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setTopLevelPagesCache<T>(
  owner: number,
  query: string,
  value: T
): void {
  store.set(buildKey(owner, query), {
    value,
    expiresAt: Date.now() + TOP_LEVEL_PAGES_CACHE_TTL_MS,
    owner,
  });
}

export function invalidateTopLevelPagesForOwner(owner: number): void {
  for (const [key, entry] of store) {
    if (entry.owner === owner) {
      store.delete(key);
    }
  }
}

export function __resetTopLevelPagesCacheForTests(): void {
  store.clear();
}
