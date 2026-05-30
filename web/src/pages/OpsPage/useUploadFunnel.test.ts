import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useUploadFunnel } from './useUploadFunnel';

const okResponse = (payload: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => payload,
});

describe('useUploadFunnel', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('fetches the default 30d window with credentials and returns the payload', async () => {
    const payload = {
      stages: {
        upload_started: 100,
        conversion_succeeded: 80,
        conversion_failed: 20,
        deck_downloaded: 60,
      },
      upload_to_download_rate_pct: 60,
      since: '2026-05-01T00:00:00.000Z',
      as_of: '2026-05-30T00:00:00.000Z',
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okResponse(payload)
    );

    const { result } = renderHook(() => useUploadFunnel());

    await waitFor(() => expect(result.current.data).toEqual(payload));

    expect(result.current.window).toBe('30d');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ops/upload-funnel?window=30d',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  test('refetches with the new window when setWindow is called', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okResponse({
        stages: {
          upload_started: 0,
          conversion_succeeded: 0,
          conversion_failed: 0,
          deck_downloaded: 0,
        },
        upload_to_download_rate_pct: 0,
        since: '2026-05-01T00:00:00.000Z',
        as_of: '2026-05-30T00:00:00.000Z',
      })
    );

    const { result } = renderHook(() => useUploadFunnel());
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setWindow('7d');
    });

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/ops/upload-funnel?window=7d',
        expect.objectContaining({ credentials: 'include' })
      )
    );
    expect(result.current.window).toBe('7d');
  });

  test('surfaces the server message when the response is not ok', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Failed to load upload funnel' }),
    });

    const { result } = renderHook(() => useUploadFunnel());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBe('Failed to load upload funnel');
  });
});
