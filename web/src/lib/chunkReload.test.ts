import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, recoverFromChunkError, withinChunkReloadCooldown } from './chunkReload';

const STORAGE_KEY = '2anki:chunkReload:lastAt';

describe('isChunkLoadError', () => {
  it('returns true for a ChunkLoadError by name', () => {
    const err = new Error('Loading chunk 5 failed');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('returns true for "Failed to fetch dynamically imported module" TypeError', () => {
    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://2anki.net/assets/SearchPage-XYZABCDE.js'
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('returns true for "error loading dynamically imported module" TypeError', () => {
    const err = new TypeError(
      'error loading dynamically imported module: https://2anki.net/assets/SearchPage-XYZABCDE.js'
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('returns false for a generic error', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
  });

  it('returns false for a network error unrelated to chunk loading', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isChunkLoadError('chunk error')).toBe(false);
  });
});

describe('recoverFromChunkError', () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('returns false and does not reload for a non-chunk error', () => {
    const result = recoverFromChunkError(new Error('boom'));
    expect(result).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('triggers reload and returns true on first chunk-load error', () => {
    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://2anki.net/assets/A.js'
    );

    const result = recoverFromChunkError(err);

    expect(result).toBe(true);
    expect(reloadMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('writes a numeric timestamp to sessionStorage on first reload', () => {
    const before = Date.now();
    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://2anki.net/assets/A.js'
    );

    recoverFromChunkError(err);

    const stored = Number(sessionStorage.getItem(STORAGE_KEY));
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(Date.now());
  });

  it('does not reload and returns false on second call within the 30s cooldown', () => {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));

    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://2anki.net/assets/A.js'
    );

    const result = recoverFromChunkError(err);

    expect(result).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads again after the cooldown window has passed', () => {
    const thirtyOneSecondsAgo = Date.now() - 31_000;
    sessionStorage.setItem(STORAGE_KEY, String(thirtyOneSecondsAgo));

    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://2anki.net/assets/A.js'
    );

    const result = recoverFromChunkError(err);

    expect(result).toBe(true);
    expect(reloadMock).toHaveBeenCalledOnce();
  });
});

describe('withinChunkReloadCooldown', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns false when no timestamp is stored', () => {
    expect(withinChunkReloadCooldown()).toBe(false);
  });

  it('returns true when a recent timestamp is stored', () => {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    expect(withinChunkReloadCooldown()).toBe(true);
  });

  it('returns false when the stored timestamp is older than 30s', () => {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now() - 31_000));
    expect(withinChunkReloadCooldown()).toBe(false);
  });
});
