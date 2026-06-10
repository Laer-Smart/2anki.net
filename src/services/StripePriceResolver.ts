import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';

export class StripePriceResolver {
  private readonly cache = new Map<string, string>();

  constructor(private readonly stripe: Pick<StripeTypes, 'prices'>) {}

  async resolveByLookupKey(lookupKey: string): Promise<string | null> {
    const cached = this.cache.get(lookupKey);
    if (cached != null) return cached;

    try {
      const result = await this.stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
      });
      const priceId = result.data[0]?.id;
      if (priceId == null) {
        console.warn('pricing.resolve.miss', { lookup_key: lookupKey });
        return null;
      }
      this.cache.set(lookupKey, priceId);
      return priceId;
    } catch (error) {
      console.error('pricing.resolve.failed', {
        lookup_key: lookupKey,
        message: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }
}
