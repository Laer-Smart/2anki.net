import { useState } from 'react';

export type PricingOrder = 'passes-first' | 'unlimited-first' | 'minimal';

const VARIANTS: PricingOrder[] = ['passes-first', 'unlimited-first', 'minimal'];

const STORAGE_KEY = 'pricing_order_variant';

function isPricingOrder(value: unknown): value is PricingOrder {
  return typeof value === 'string' && (VARIANTS as string[]).includes(value);
}

function readStored(): PricingOrder | null {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isPricingOrder(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * `?variant=passes-first` / `?variant=unlimited-first` forces a layout for
 * preview and QA. It does not persist, so it never changes the visitor's
 * real assignment or the experiment buckets.
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

function assignVariant(): PricingOrder {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues == null) {
    return 'passes-first';
  }
  const byte = cryptoObj.getRandomValues(new Uint8Array(1))[0];
  return VARIANTS[byte % VARIANTS.length];
}

/**
 * Stable 50/50 assignment to one of two pricing-page layouts, persisted per
 * device so a visitor always sees the same order. Anonymous-friendly: most
 * pricing traffic is logged out, so localStorage is the right store here.
 */
export function usePricingOrderVariant(): PricingOrder {
  const [variant] = useState<PricingOrder>(() => {
    const override = readOverride();
    if (override != null) return override;
    const stored = readStored();
    if (stored != null) return stored;
    const assigned = assignVariant();
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, assigned);
    } catch {
      // Storage unavailable (private mode, SSR) — fall back to the default order.
    }
    return assigned;
  });

  return variant;
}
