import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { archiveLegacyPrices } from './archiveLegacyPrices';

describe('archiveLegacyPrices', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs the dryRun flag and returns the per-price plan', async () => {
    const payload = {
      livemode: true,
      prices: [
        {
          priceId: 'price_legacy_monthly',
          lookupKey: 'legacy_monthly',
          unitAmount: 600,
          interval: 'month',
          active: true,
          action: 'would_archive',
        },
        {
          priceId: 'price_legacy_yearly',
          lookupKey: 'legacy_yearly',
          unitAmount: 6000,
          interval: 'year',
          active: true,
          action: 'would_archive',
        },
      ],
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await archiveLegacyPrices(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/archive-legacy-prices',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      }
    );
    expect(result).toEqual(payload);
  });

  test('sends dryRun false when archiving for real', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ livemode: false, prices: [] }),
    });

    await archiveLegacyPrices(false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/archive-legacy-prices',
      expect.objectContaining({ body: JSON.stringify({ dryRun: false }) })
    );
  });

  test('throws the server message on a non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () =>
        Promise.resolve({ message: 'Failed to archive legacy prices' }),
    });

    await expect(archiveLegacyPrices(true)).rejects.toThrow(
      'Failed to archive legacy prices'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(archiveLegacyPrices(true)).rejects.toThrow('404 Not Found');
  });
});
