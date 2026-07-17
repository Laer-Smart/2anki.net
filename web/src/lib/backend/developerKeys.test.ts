import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  requestDeveloperAccess,
} from './developerKeys';

function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => body,
  } as Response;
}

describe('developerKeys client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('listApiKeys parses the keys array (regression: response is read via text())', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      textResponse(200, JSON.stringify({ keys: [{ id: 1, name: 'CLI' }] }))
    );
    const keys = await listApiKeys();
    expect(keys).toEqual([{ id: 1, name: 'CLI' }]);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
  });

  test('createApiKey returns the created key with its secret', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      textResponse(
        201,
        JSON.stringify({ id: 2, name: 'k', secret: 'sk_live_x' })
      )
    );
    const created = await createApiKey('k');
    expect(created.secret).toBe('sk_live_x');
  });

  test('revokeApiKey tolerates an empty 204 body', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      textResponse(204, '')
    );
    await expect(revokeApiKey(2)).resolves.toBeUndefined();
  });

  test('surfaces the server message and status on an error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      textResponse(403, JSON.stringify({ message: 'not enabled' }))
    );
    await expect(requestDeveloperAccess()).rejects.toMatchObject({
      message: 'not enabled',
      status: 403,
    });
  });
});
