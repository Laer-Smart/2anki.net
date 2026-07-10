import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track } from './track';

describe('track (web helper)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to /api/events/track with the event name', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 202 }));

    track('deck_downloaded');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/events/track',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'include',
      })
    );

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArgs.body as string);
    expect(body.name).toBe('deck_downloaded');
  });

  it('includes props in the request body when provided', () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 202 }));

    track('conversion_succeeded', { source: 'upload' });

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArgs.body as string);
    expect(body.props).toEqual({ source: 'upload' });
  });

  it('is silent when fetch throws — never throws to the caller', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockRejectedValue(new TypeError('network error'));

    await expect(
      new Promise<void>((resolve) => {
        track('upload_error_chat_shown');
        setTimeout(resolve, 0);
      })
    ).resolves.toBeUndefined();
  });
});
