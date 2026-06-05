import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePricingOrderVariant } from './usePricingOrderVariant';

afterEach(() => {
  globalThis.localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('usePricingOrderVariant', () => {
  it('assigns one of the known variants', () => {
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(['passes-first', 'unlimited-first', 'minimal']).toContain(
      result.current
    );
  });

  it('persists the assignment so a returning visitor sees the same order', () => {
    localStorage.setItem('pricing_order_variant', 'unlimited-first');
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(result.current).toBe('unlimited-first');
  });

  it('writes the assigned variant to storage on first visit', () => {
    expect(localStorage.getItem('pricing_order_variant')).toBeNull();
    renderHook(() => usePricingOrderVariant());
    expect(['passes-first', 'unlimited-first', 'minimal']).toContain(
      localStorage.getItem('pricing_order_variant')
    );
  });

  it('honours the ?variant= preview override without persisting it', () => {
    window.history.pushState({}, '', '/?variant=unlimited-first');
    const { result } = renderHook(() => usePricingOrderVariant());
    expect(result.current).toBe('unlimited-first');
    expect(localStorage.getItem('pricing_order_variant')).toBeNull();
  });
});
