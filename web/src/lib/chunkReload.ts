const STORAGE_KEY = '2anki:chunkReload:lastAt';
const COOLDOWN_MS = 30_000;

const CHUNK_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
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

  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  location.reload();
  return true;
}
