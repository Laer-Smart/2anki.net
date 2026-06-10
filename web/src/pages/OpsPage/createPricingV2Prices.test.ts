import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createPricingV2Prices } from './createPricingV2Prices';

describe('createPricingV2Prices', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs to the endpoint and returns the per-key result', async () => {
    const payload = {
      livemode: false,
      prices: [
        {
          lookupKey: 'v2_monthly',
          status: 'created',
          priceId: 'price_monthly',
          unitAmount: 799,
          interval: 'month',
        },
        {
          lookupKey: 'v2_annual',
          status: 'already_exists',
          priceId: 'price_annual',
          unitAmount: 6400,
          interval: 'year',
        },
      ],
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await createPricingV2Prices();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/create-pricing-v2-prices',
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
        Promise.resolve({ message: 'Failed to create pricing v2 prices' }),
    });

    await expect(createPricingV2Prices()).rejects.toThrow(
      'Failed to create pricing v2 prices'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(createPricingV2Prices()).rejects.toThrow('404 Not Found');
  });
});
