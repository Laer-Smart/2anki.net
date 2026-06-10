import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { sendPriceLockInEmails } from './sendPriceLockInEmails';

describe('sendPriceLockInEmails', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('POSTs dryRun true and returns the segment count', async () => {
    const payload = {
      count: 18800,
      skipped: 0,
      dryRun: true,
      variantA: 0,
      variantB: 0,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await sendPriceLockInEmails(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/send-price-lock-in-emails',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      }
    );
    expect(result).toEqual(payload);
  });

  test('POSTs dryRun false for a real send and returns the sent count', async () => {
    const payload = {
      count: 480,
      skipped: 20,
      dryRun: false,
      variantA: 240,
      variantB: 240,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payload),
    });

    const result = await sendPriceLockInEmails(false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/send-price-lock-in-emails',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      }
    );
    expect(result).toEqual(payload);
  });

  test('throws the server message on a non-ok response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () =>
        Promise.resolve({ message: 'Failed to run price lock-in emails' }),
    });

    await expect(sendPriceLockInEmails(true)).rejects.toThrow(
      'Failed to run price lock-in emails'
    );
  });

  test('falls back to status text when the error body has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.reject(new Error('no body')),
    });

    await expect(sendPriceLockInEmails(false)).rejects.toThrow('404 Not Found');
  });
});
