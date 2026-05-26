import { useState } from 'react';

export type PricingOrder = 'passes-first' | 'unlimited-first';

const STORAGE_KEY = 'pricing_order_variant';

function isPricingOrder(value: unknown): value is PricingOrder {
  return value === 'passes-first' || value === 'unlimited-first';
}

function readStored(): PricingOrder | null {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isPricingOrder(stored) ? stored : null;
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
  return byte < 128 ? 'passes-first' : 'unlimited-first';
}

/**
 * Stable 50/50 assignment to one of two pricing-page layouts, persisted per
 * device so a visitor always sees the same order. Anonymous-friendly: most
 * pricing traffic is logged out, so localStorage is the right store here.
 */
export function usePricingOrderVariant(): PricingOrder {
  const [variant] = useState<PricingOrder>(() => {
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
