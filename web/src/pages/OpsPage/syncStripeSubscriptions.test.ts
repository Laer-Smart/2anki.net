import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { syncStripeSubscriptions } from './syncStripeSubscriptions';

describe('syncStripeSubscriptions', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs to the sync endpoint and returns the message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 202,
      statusText: 'Accepted',
      json: () => Promise.resolve({ message: 'Sync started.' }),
    });

    const result = await syncStripeSubscriptions();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/sync-stripe-subscriptions',
      { method: 'POST', credentials: 'include' }
    );
    expect(result).toEqual({ message: 'Sync started.' });
  });

  test('throws the server message when a sync is already running', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: () =>
        Promise.resolve({
          message: 'A Stripe subscription sync is already running.',
        }),
    });

    await expect(syncStripeSubscriptions()).rejects.toThrow(
      'A Stripe subscription sync is already running.'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(syncStripeSubscriptions()).rejects.toThrow(
      '500 Internal Server Error'
    );
  });
});
