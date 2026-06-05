import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  acknowledgeAnkiWeb,
  cancelPendingSync,
  fetchUserPreferences,
  hydrateFromServer,
  migrateToServer,
  scheduleSync,
} from './userPreferencesSync';

const setCookie = (value: string) => {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => value,
  });
};

const flushDebounce = async () => {
  vi.advanceTimersByTime(600);
  await Promise.resolve();
  await Promise.resolve();
};

describe('userPreferencesSync — anonymous user (no token cookie)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setCookie('');
    localStorage.clear();
    localStorage.setItem('2anki-theme', 'dark');
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 })
    );
  });

  afterEach(() => {
    cancelPendingSync();
    fetchSpy.mockRestore();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('scheduleSync does not call the preferences endpoint', async () => {
    scheduleSync();
    await flushDebounce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetchUserPreferences returns null without calling fetch', async () => {
    const result = await fetchUserPreferences();
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('hydrateFromServer is a no-op', async () => {
    await hydrateFromServer();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('migrateToServer is a no-op', async () => {
    await migrateToServer();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('acknowledgeAnkiWeb still writes localStorage but does not call fetch', async () => {
    await acknowledgeAnkiWeb();
    expect(localStorage.getItem('ankify_anki_web_acknowledged')).toBe('true');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('userPreferencesSync — authenticated user (token cookie present)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setCookie('token=abc123; other=value');
    localStorage.clear();
    localStorage.setItem('2anki-theme', 'dark');
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 })
    );
  });

  afterEach(() => {
    cancelPendingSync();
    fetchSpy.mockRestore();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('scheduleSync PATCHes the preferences endpoint after the debounce window', async () => {
    scheduleSync();
    await flushDebounce();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users/me/preferences',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
