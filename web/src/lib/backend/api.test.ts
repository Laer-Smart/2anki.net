import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { get } from './api';
import { UserNotice } from '../errors/UserNotice';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('location', { origin: 'http://localhost', pathname: '/' });
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.get error tagging', () => {
  it('tags a 5xx error message with the request path', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'boom' }), { status: 503 })
    );

    await expect(get('http://localhost/api/jobs')).rejects.toThrowError(
      /GET \/api\/jobs/
    );
  });

  it('attaches url and method as properties on the thrown error', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'boom' }), { status: 500 })
    );

    let caught: (Error & { url?: string; method?: string }) | undefined;
    try {
      await get('http://localhost/api/uploads');
    } catch (e) {
      caught = e as Error & { url?: string; method?: string };
    }

    expect(caught?.url).toBe('/api/uploads');
    expect(caught?.method).toBe('GET');
  });

  it('tags network failures with the URL', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(get('http://localhost/api/jobs')).rejects.toThrowError(
      /GET \/api\/jobs/
    );
  });

  it('throws UserNotice for an intentional backend message', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'Notion is not connected.' }),
        { status: 409 }
      )
    );

    await expect(get('http://localhost/api/notion/me')).rejects.toBeInstanceOf(
      UserNotice
    );
  });

  it('throws UserNotice with code when present', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'API token is invalid.',
          code: 'notion_unauthorized',
        }),
        { status: 409 }
      )
    );

    let caught: UserNotice | undefined;
    try {
      await get('http://localhost/api/notion/search');
    } catch (e) {
      caught = e as UserNotice;
    }

    expect(caught).toBeInstanceOf(UserNotice);
    expect(caught?.code).toBe('notion_unauthorized');
  });
});
