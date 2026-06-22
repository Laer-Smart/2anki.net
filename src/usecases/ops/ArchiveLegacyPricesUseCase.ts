import Stripe from 'stripe';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';

import {
  V2_ANNUAL_LOOKUP_KEY,
  V2_MONTHLY_LOOKUP_KEY,
} from '../checkout/pricingV2';

type StripeClient = InstanceType<typeof Stripe>;

const GUARDED_LOOKUP_KEYS = new Set<string>([
  V2_MONTHLY_LOOKUP_KEY,
  V2_ANNUAL_LOOKUP_KEY,
]);

export type ArchiveLegacyPriceAction =
  | 'would_archive'
  | 'archived'
  | 'already_archived'
  | 'skipped_missing_env'
  | 'skipped_guard';

export interface ArchiveLegacyPriceResult {
  priceId: string;
  lookupKey: string | null;
  unitAmount: number | null;
  interval: string | null;
  active: boolean | null;
  action: ArchiveLegacyPriceAction;
}

export interface ArchiveLegacyPricesResult {
  livemode: boolean;
  prices: ArchiveLegacyPriceResult[];
}

export class ArchiveLegacyPricesUseCase {
  constructor(private readonly stripe: StripeClient) {}

  async execute(dryRun: boolean): Promise<ArchiveLegacyPricesResult> {
    const configuredIds = [
      process.env.UNLIMITED_MONTHLY_PRICE_ID ?? '',
      process.env.UNLIMITED_YEARLY_PRICE_ID ?? '',
    ];

    const prices: ArchiveLegacyPriceResult[] = [];
    let livemode = false;

    for (const priceId of configuredIds) {
      const result = await this.processPrice(priceId, dryRun);
      prices.push(result.summary);
      if (result.livemode) {
        livemode = true;
      }
    }

    return { livemode, prices };
  }

  private async processPrice(
    priceId: string,
    dryRun: boolean
  ): Promise<{ summary: ArchiveLegacyPriceResult; livemode: boolean }> {
    if (priceId === '') {
      return {
        summary: {
          priceId: '',
          lookupKey: null,
          unitAmount: null,
          interval: null,
          active: null,
          action: 'skipped_missing_env',
        },
        livemode: false,
      };
    }

    const price = await this.stripe.prices.retrieve(priceId);
    const summary: ArchiveLegacyPriceResult = {
      priceId: price.id,
      lookupKey: price.lookup_key ?? null,
      unitAmount: price.unit_amount ?? null,
      interval: price.recurring?.interval ?? null,
      active: price.active,
      action: resolveAction(price, dryRun),
    };

    if (summary.action === 'archived') {
      await this.stripe.prices.update(price.id, { active: false });
    }

    return { summary, livemode: price.livemode };
  }
}

function resolveAction(
  price: StripeTypes.Price,
  dryRun: boolean
): ArchiveLegacyPriceAction {
  if (price.lookup_key != null && GUARDED_LOOKUP_KEYS.has(price.lookup_key)) {
    return 'skipped_guard';
  }
  if (price.active === false) {
    return 'already_archived';
  }
  if (dryRun) {
    return 'would_archive';
  }
  return 'archived';
}
