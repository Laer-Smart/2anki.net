import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stripUrlParam } from './stripUrlParam';

describe('stripUrlParam', () => {
  let replaceState: ReturnType<typeof vi.fn>;

  function setLocation(pathname: string, search: string, hash = '') {
    replaceState = vi.fn();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      configurable: true,
      value: { pathname, search, hash },
    });
    Object.defineProperty(globalThis, 'history', {
      writable: true,
      configurable: true,
      value: { state: null, replaceState },
    });
  }

  beforeEach(() => {
    setLocation('/', '');
  });

  it('removes the named param from the address bar', () => {
    setLocation('/auth/magic', '?token=secret-value');
    stripUrlParam('token');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/auth/magic');
  });

  it('keeps other params intact when stripping one', () => {
    setLocation('/auth/magic', '?token=secret-value&redirect=anki');
    stripUrlParam('token');
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/auth/magic?redirect=anki'
    );
  });

  it('strips the Stripe session id and preserves the path', () => {
    setLocation('/successful-checkout', '?session_id=cs_test_abc');
    stripUrlParam('session_id');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/successful-checkout');
  });

  it('preserves the hash fragment', () => {
    setLocation('/account', '?token=secret-value', '#plan');
    stripUrlParam('token');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/account#plan');
  });

  it('does nothing when the param is absent', () => {
    setLocation('/account', '');
    stripUrlParam('token');
    expect(replaceState).not.toHaveBeenCalled();
  });
});
