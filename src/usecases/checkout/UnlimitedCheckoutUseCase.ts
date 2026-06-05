import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import hashToken from '../../lib/misc/hashToken';
import { optionalMetadata } from './checkoutMetadata';

export type UnlimitedInterval = 'month' | 'year';

export interface UnlimitedCheckoutResult {
  url: string;
}

export class UnlimitedCheckoutUseCase {
  constructor(
    private readonly stripe: Pick<StripeTypes, 'checkout'>,
    private readonly monthlyPriceId: string,
    private readonly yearlyPriceId: string
  ) {}

  async execute(input: {
    userEmail: string;
    userId: number;
    interval: UnlimitedInterval;
    stripeCustomerId?: string | null;
    variant?: string;
    anonId?: string;
    surface?: string;
    gaClientId?: string;
  }): Promise<UnlimitedCheckoutResult> {
    console.info('unlimited.checkout.started', { user_id: input.userId, interval: input.interval });

    const priceId = input.interval === 'year' ? this.yearlyPriceId : this.monthlyPriceId;
    const appUrl = process.env.APP_URL ?? 'https://2anki.net';

    const sessionParams: StripeTypes.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/upload`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: input.stripeCustomerId == null ? input.userEmail : undefined,
      customer: input.stripeCustomerId ?? undefined,
      after_expiration: { recovery: { enabled: true } },
      metadata: {
        user_id: String(input.userId),
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
      session_id_hash: hashToken(session.id ?? ''),
    });

    return { url: session.url! };
  }
}
