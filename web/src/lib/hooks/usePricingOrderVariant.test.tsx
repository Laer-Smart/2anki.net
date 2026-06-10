import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePricingOrderVariant } from './usePricingOrderVariant';

afterEach(() => {
  globalThis.localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('usePricingOrderVariant', () => {
  it('returns minimal by default', () => {
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(result.current).toBe('minimal');
  });

  it('ignores an old stored assignment and still returns minimal', () => {
    localStorage.setItem('pricing_order_variant', 'unlimited-first');
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(result.current).toBe('minimal');
  });

  it('clears the stale assignment key from storage', () => {
    localStorage.setItem('pricing_order_variant', 'unlimited-first');
    renderHook(() => usePricingOrderVariant());
    expect(localStorage.getItem('pricing_order_variant')).toBeNull();
  });

  it('honours the ?variant= preview override without persisting it', () => {
    window.history.pushState({}, '', '/?variant=unlimited-first');
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(result.current).toBe('unlimited-first');
    expect(localStorage.getItem('pricing_order_variant')).toBeNull();
  });
});
