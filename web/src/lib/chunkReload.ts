import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const STORAGE_KEY = '2anki:chunkReload:lastAt';
const PER_CHUNK_KEY_PREFIX = '2anki:chunkReload:chunk:';
const COOLDOWN_MS = 30_000;
const RELOADING_FLAG_KEY = '2anki:chunkReload:reloading';

const CHUNK_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Unable to preload CSS',
  'Importing a module script failed',
];

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === 'ChunkLoadError') {
    return true;
  }

  return CHUNK_ERROR_MESSAGES.some((msg) => error.message.includes(msg));
}

export function withinChunkReloadCooldown(): boolean {
  const storedAt = sessionStorage.getItem(STORAGE_KEY);
  if (storedAt == null) {
    return false;
  }
  return Date.now() - Number(storedAt) < COOLDOWN_MS;
}

export function recoverFromChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }

  if (withinChunkReloadCooldown()) {
    return false;
  }

  markReloading();
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  location.reload();
  return true;
}

function markReloading(): void {
  try {
    sessionStorage.setItem(RELOADING_FLAG_KEY, '1');
  } catch {
    // sessionStorage may be disabled; overlay simply won't render.
  }
}

export function clearReloadingFlag(): void {
  try {
    sessionStorage.removeItem(RELOADING_FLAG_KEY);
  } catch {
    // ignore
  }
}

export function isReloadingForFreshChunks(): boolean {
  try {
    return sessionStorage.getItem(RELOADING_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function reloadOnceForChunk<T>(
  chunkKey: string,
  error: Error
): Promise<{ default: T }> {
  const perChunkKey = `${PER_CHUNK_KEY_PREFIX}${chunkKey}`;
  if (sessionStorage.getItem(perChunkKey) != null) {
    throw error;
  }
  if (
    typeof document !== 'undefined' &&
    document.visibilityState !== 'visible'
  ) {
    throw error;
  }
  sessionStorage.setItem(perChunkKey, String(Date.now()));
  markReloading();
  location.reload();
  return new Promise<{ default: T }>(() => {});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy's generic requires ComponentType<any> to preserve route component prop shapes.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkKey: string
): LazyExoticComponent<T> {
  return lazy<T>(async () => {
    try {
      const mod = await factory();
      if (mod == null || (mod as { default?: T }).default == null) {
        return reloadOnceForChunk<T>(
          chunkKey,
          new Error('Importing a module script failed.')
        );
      }
      return mod;
    } catch (error) {
      if (!isChunkLoadError(error)) {
        throw error;
      }
      return reloadOnceForChunk<T>(chunkKey, error as Error);
    }
  });
}
