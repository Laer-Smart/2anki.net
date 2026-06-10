import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { deleteInactiveUsers } from './deleteInactiveUsers';

describe('deleteInactiveUsers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs dryRun true and returns the candidate count', async () => {
    const payload = { count: 42, dryRun: true };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await deleteInactiveUsers(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/delete-inactive-users?dryRun=true',
      { method: 'POST', credentials: 'include' }
    );
    expect(result).toEqual(payload);
  });

  test('POSTs dryRun false for a real delete and returns the deleted count', async () => {
    const payload = { count: 42, dryRun: false };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await deleteInactiveUsers(false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/delete-inactive-users?dryRun=false',
      { method: 'POST', credentials: 'include' }
    );
    expect(result).toEqual(payload);
  });

  test('throws the server message on a non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () =>
        Promise.resolve({ message: 'Failed to run inactive user deletion' }),
    });

    await expect(deleteInactiveUsers(true)).rejects.toThrow(
      'Failed to run inactive user deletion'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(deleteInactiveUsers(false)).rejects.toThrow('404 Not Found');
  });
});
