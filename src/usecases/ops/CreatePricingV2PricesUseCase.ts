import Stripe from 'stripe';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';

import {
  PRICING_AMOUNTS,
  V2_ANNUAL_LOOKUP_KEY,
  V2_MONTHLY_LOOKUP_KEY,
} from '../checkout/pricingV2';

type StripeClient = InstanceType<typeof Stripe>;

export const PRICE_METADATA = { version: 'v2', created: '2026-06' } as const;

interface PlannedPrice {
  lookupKey: string;
  nickname: string;
  unitAmount: number;
  interval: 'month' | 'year';
}

const PLANNED_PRICES: PlannedPrice[] = [
  {
    lookupKey: V2_MONTHLY_LOOKUP_KEY,
    nickname: 'Unlimited Monthly v2',
    unitAmount: PRICING_AMOUNTS.v2.monthly,
    interval: 'month',
  },
  {
    lookupKey: V2_ANNUAL_LOOKUP_KEY,
    nickname: 'Unlimited Annual v2',
    unitAmount: PRICING_AMOUNTS.v2.annual,
    interval: 'year',
  },
];

export type CreatePricingV2PriceStatus = 'created' | 'already_exists';

export interface CreatePricingV2PriceResult {
  lookupKey: string;
  status: CreatePricingV2PriceStatus;
  priceId: string;
  unitAmount: number;
  interval: 'month' | 'year';
}

export interface CreatePricingV2PricesResult {
  livemode: boolean;
  prices: CreatePricingV2PriceResult[];
}

export class CreatePricingV2PricesUseCase {
  constructor(private readonly stripe: StripeClient) {}

  async execute(): Promise<CreatePricingV2PricesResult> {
    const productId = await this.resolveTargetProductId();
    const prices: CreatePricingV2PriceResult[] = [];
    let livemode = false;

    for (const planned of PLANNED_PRICES) {
      const result = await this.ensurePrice(productId, planned);
      prices.push(result.summary);
      livemode = result.livemode;
    }

    return { livemode, prices };
  }

  private async resolveTargetProductId(): Promise<string> {
    const products = await this.stripe.products.list({
      active: true,
      limit: 100,
    });
    const unlimited = products.data.find((product) =>
      product.name.toLowerCase().includes('unlimited')
    );
    if (unlimited != null) {
      return unlimited.id;
    }
    const created = await this.stripe.products.create({
      name: 'Unlimited',
      metadata: PRICE_METADATA,
    });
    return created.id;
  }

  private async ensurePrice(
    productId: string,
    planned: PlannedPrice
  ): Promise<{ summary: CreatePricingV2PriceResult; livemode: boolean }> {
    const existing = await this.findExistingPriceByLookupKey(planned.lookupKey);
    if (existing != null) {
      return {
        summary: {
          lookupKey: planned.lookupKey,
          status: 'already_exists',
          priceId: existing.id,
          unitAmount: planned.unitAmount,
          interval: planned.interval,
        },
        livemode: existing.livemode,
      };
    }

    const price = await this.stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: planned.unitAmount,
      nickname: planned.nickname,
      lookup_key: planned.lookupKey,
      recurring: { interval: planned.interval },
      metadata: PRICE_METADATA,
    });

    return {
      summary: {
        lookupKey: planned.lookupKey,
        status: 'created',
        priceId: price.id,
        unitAmount: planned.unitAmount,
        interval: planned.interval,
      },
      livemode: price.livemode,
    };
  }

  private async findExistingPriceByLookupKey(
    lookupKey: string
  ): Promise<StripeTypes.Price | null> {
    const result = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
    });
    return result.data[0] ?? null;
  }
}
