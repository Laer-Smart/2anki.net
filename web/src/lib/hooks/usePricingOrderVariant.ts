import { useState } from 'react';

export type PricingOrder = 'passes-first' | 'unlimited-first' | 'minimal';

const VARIANTS: PricingOrder[] = ['passes-first', 'unlimited-first', 'minimal'];

const STORAGE_KEY = 'pricing_order_variant';

const DEFAULT_ORDER: PricingOrder = 'minimal';

function isPricingOrder(value: unknown): value is PricingOrder {
  return typeof value === 'string' && (VARIANTS as string[]).includes(value);
}

/**
 * `?variant=` forces a layout for QA without persisting. The pricing-page A/B
 * test concluded on `minimal`, so every real visitor gets that order and any
 * old stored assignment is ignored.
 */
function readOverride(): PricingOrder | null {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get(
      'variant'
    );
    return isPricingOrder(value) ? value : null;
  } catch {
    return null;
  }
}

function clearStaleAssignment(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, SSR) — nothing to clear.
  }
}

export function usePricingOrderVariant(): PricingOrder {
  const [variant] = useState<PricingOrder>(() => {
    clearStaleAssignment();
    return readOverride() ?? DEFAULT_ORDER;
  });

  return variant;
}
