import type { PassKind } from '../../data_layer/UserPassRepository';

export interface ConsumableProduct {
  productId: string;
  passKind: PassKind;
  durationMs: number;
  successMessage: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const CONSUMABLE_PRODUCTS: Record<string, ConsumableProduct> = {
  'daypass.24h': {
    productId: 'daypass.24h',
    passKind: '24h',
    durationMs: DAY_MS,
    successMessage: 'Day Pass active — unlimited cards for the next 24 hours',
  },
  'weekpass.7d': {
    productId: 'weekpass.7d',
    passKind: '7d',
    durationMs: 7 * DAY_MS,
    successMessage: 'Week Pass active — unlimited cards for the next 7 days',
  },
};

export function findConsumableProduct(
  productId: string
): ConsumableProduct | null {
  return CONSUMABLE_PRODUCTS[productId] ?? null;
}
