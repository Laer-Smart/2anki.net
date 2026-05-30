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

  it('includes context when provided', () => {
    reportClientError(new Error('ctx test'), { route: '/upload' });
    const [, init] = getLastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.context).toEqual({ route: '/upload' });
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
});
