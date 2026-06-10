import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import hashToken from '../../lib/misc/hashToken';
import { optionalMetadata } from './checkoutMetadata';
import { StripePriceResolver } from '../../services/StripePriceResolver';
import {
  PricingCohort,
  resolveCohort,
  V2_ANNUAL_LOOKUP_KEY,
  V2_MONTHLY_LOOKUP_KEY,
} from './pricingV2';

export type UnlimitedInterval = 'month' | 'year';

export interface UnlimitedCheckoutResult {
  url: string;
  cohort: PricingCohort;
}

export class UnlimitedCheckoutUseCase {
  constructor(
    private readonly stripe: Pick<StripeTypes, 'checkout'>,
    private readonly monthlyPriceId: string,
    private readonly yearlyPriceId: string,
    private readonly priceResolver?: StripePriceResolver
  ) {}

  private async resolvePriceId(
    interval: UnlimitedInterval,
    cohort: PricingCohort
  ): Promise<string> {
    const legacyId =
      interval === 'year' ? this.yearlyPriceId : this.monthlyPriceId;
    if (cohort === 'legacy' || this.priceResolver == null) {
      return legacyId;
    }
    const lookupKey =
      interval === 'year' ? V2_ANNUAL_LOOKUP_KEY : V2_MONTHLY_LOOKUP_KEY;
    const resolved = await this.priceResolver.resolveByLookupKey(lookupKey);
    if (resolved == null) {
      console.error('unlimited.checkout.v2_resolve_fallback', {
        cohort,
        interval,
        lookup_key: lookupKey,
        reason: 'lookup_key resolution returned null, serving legacy price id',
      });
      return legacyId;
    }
    return resolved;
  }

  async execute(input: {
    userEmail: string;
    userId: number;
    interval: UnlimitedInterval;
    stripeCustomerId?: string | null;
    variant?: string;
    anonId?: string;
    surface?: string;
    gaClientId?: string;
    pricingV2On?: boolean;
    createdAt?: Date | null;
    now?: Date;
  }): Promise<UnlimitedCheckoutResult> {
    const cohort = resolveCohort({
      flagOn: input.pricingV2On === true,
      createdAt: input.createdAt ?? null,
      now: input.now ?? new Date(),
    });

    console.info('unlimited.checkout.started', {
      user_id: input.userId,
      interval: input.interval,
      cohort,
    });

    const priceId = await this.resolvePriceId(input.interval, cohort);
    const appUrl = process.env.APP_URL ?? 'https://2anki.net';

    const sessionParams: StripeTypes.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/upload`,
      cancel_url: `${appUrl}/pricing`,
      customer_email:
        input.stripeCustomerId == null ? input.userEmail : undefined,
      customer: input.stripeCustomerId ?? undefined,
      after_expiration: { recovery: { enabled: true } },
      metadata: {
        user_id: String(input.userId),
        cohort,
        ...optionalMetadata({
          pricing_variant: input.variant,
          anon_id: input.anonId,
          surface: input.surface,
          ga_client_id: input.gaClientId,
        }),
      },
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    console.info('unlimited.checkout.session_created', {
      user_id: input.userId,
      interval: input.interval,
      cohort,
      session_id_hash: hashToken(session.id ?? ''),
    });

    return { url: session.url!, cohort };
  }
}
