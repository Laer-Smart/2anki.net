import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createSemesterPass } from './createSemesterPass';

describe('createSemesterPass', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs to the create-semester-pass endpoint and returns the provisioned result', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({
          stripe_product_id: 'prod_123',
          stripe_price_id: 'price_123',
          created_product: true,
          created_price: true,
        }),
    });

    const result = await createSemesterPass();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/commands/create-semester-pass',
      { method: 'POST', credentials: 'include' }
    );
    expect(result).toEqual({
      stripe_product_id: 'prod_123',
      stripe_price_id: 'price_123',
      created_product: true,
      created_price: true,
    });
  });

  test('throws the server message on failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () =>
        Promise.resolve({ message: 'Failed to provision semester pass' }),
    });

    await expect(createSemesterPass()).rejects.toThrow(
      'Failed to provision semester pass'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(createSemesterPass()).rejects.toThrow(
      '500 Internal Server Error'
    );
  });
});
