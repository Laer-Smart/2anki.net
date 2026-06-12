import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getOrphanedSubscriptions,
  reconcileOrphanedSubscriptions,
} from './orphanedSubscriptions';

describe('orphanedSubscriptions', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('getOrphanedSubscriptions GETs the preview endpoint and returns the payload', async () => {
    const payload = {
      count: 1,
      orphans: [
        {
          id: 9,
          email: 'payer@example.com',
          stripeProductId: 'prod_unlimited',
          createdAt: '2026-05-01T00:00:00.000Z',
          customerId: 'cus_123',
        },
      ],
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await getOrphanedSubscriptions();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/subscriptions/orphaned',
      { method: 'GET', credentials: 'include' }
    );
    expect(result).toEqual(payload);
  });

  test('reconcileOrphanedSubscriptions POSTs the reconcile endpoint and returns the summary', async () => {
    const payload = {
      found: 1,
      emailed: 1,
      skippedRecentlyNotified: 0,
      skippedNoEmail: 0,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await reconcileOrphanedSubscriptions();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/subscriptions/reconcile',
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
        Promise.resolve({ message: 'Failed to load orphaned subscriptions' }),
    });

    await expect(getOrphanedSubscriptions()).rejects.toThrow(
      'Failed to load orphaned subscriptions'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(reconcileOrphanedSubscriptions()).rejects.toThrow(
      '404 Not Found'
    );
  });
});
