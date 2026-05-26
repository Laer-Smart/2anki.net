import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { resolveErrorGroup, reopenErrorGroup } from './resolveErrorGroup';

const HASH = 'a'.repeat(64);

describe('resolveErrorGroup / reopenErrorGroup', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('resolveErrorGroup POSTs to the resolve endpoint', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    });

    await resolveErrorGroup(HASH);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/ops/errors/${HASH}/resolve`,
      { method: 'POST' }
    );
  });

  test('reopenErrorGroup DELETEs the resolve endpoint', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    });

    await reopenErrorGroup(HASH);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/ops/errors/${HASH}/resolve`,
      { method: 'DELETE' }
    );
  });

  test('throws when the response is not ok', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(resolveErrorGroup(HASH)).rejects.toThrow('500 Internal Server Error');
  });
});
