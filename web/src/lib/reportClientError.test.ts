import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportClientError } from './reportClientError';
import { UserNotice } from './errors/UserNotice';

const fetchSpy = vi.fn(() =>
  Promise.resolve(new Response(null, { status: 202 }))
);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('navigator', { userAgent: 'Vitest/1.0' });
  fetchSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function getLastCall(): [string, RequestInit] {
  const calls = fetchSpy.mock.calls as unknown as Array<[string, RequestInit]>;
  const last = calls[calls.length - 1];
  return last ?? ['' , {}];
}

describe('reportClientError', () => {
  it('calls fetch with the correct endpoint and method', () => {
    reportClientError(new Error('boom'));
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = getLastCall();
    expect(url).toBe('/api/events/errors');
    expect(init.method).toBe('POST');
  });

  it('sends message and source=web in the payload', () => {
    reportClientError(new Error('null ref'));
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.message).toBe('null ref');
    expect(body.source).toBe('web');
  });

  it('includes stack when the error has one', () => {
    const err = new Error('stack test');
    reportClientError(err);
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(typeof body.stack).toBe('string');
  });

  it('includes userAgent from navigator', () => {
    reportClientError(new Error('ua test'));
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.userAgent).toBe('Vitest/1.0');
  });

  it('includes caller context merged with the translate breadcrumbs', () => {
    reportClientError(new Error('ctx test'), { route: '/upload' });
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.context).toMatchObject({ route: '/upload' });
  });

  it('captures url, lang, and translated for the next investigator', () => {
    reportClientError(new Error('translate test'));
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.url).toBe(window.location.href);
    const context = body.context as Record<string, unknown>;
    expect(context).toHaveProperty('lang');
    expect(context.translated).toBe(false);
  });

  it('flags translated when Chrome Translate has added its html class', () => {
    document.documentElement.classList.add('translated-ltr');
    try {
      reportClientError(new Error('translated page'));
      const [, init] = getLastCall();
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const context = body.context as Record<string, unknown>;
      expect(context.translated).toBe(true);
    } finally {
      document.documentElement.classList.remove('translated-ltr');
    }
  });

  it('swallows a fetch failure without throwing', () => {
    fetchSpy.mockReturnValueOnce(Promise.reject(new Error('network down')));
    expect(() => reportClientError(new Error('bad'))).not.toThrow();
  });

  it('handles non-Error values gracefully', () => {
    expect(() => reportClientError('plain string error')).not.toThrow();
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.message).toBe('plain string error');
  });

  it('skips UserNotice instances without calling fetch', () => {
    reportClientError(new UserNotice('Notion is not connected.'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips reporting when the browser is offline', () => {
    vi.stubGlobal('navigator', { userAgent: 'Vitest/1.0', onLine: false });
    reportClientError(new Error('boom while offline'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still reports when onLine is undefined', () => {
    reportClientError(new Error('real error'));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('skips AbortError', () => {
    const aborted = new Error('The user aborted a request.');
    aborted.name = 'AbortError';
    reportClientError(aborted);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'Network error on GET /api/upload/mine: Load failed',
  ])('skips transient network message %s', (message) => {
    reportClientError(new Error(message));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a message that merely mentions a transient phrase mid-string', () => {
    reportClientError(new Error('Parser said: Load failed is not a card'));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
