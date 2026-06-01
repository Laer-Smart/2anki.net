import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import hashToken from '../../lib/misc/hashToken';

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
      metadata: {
        user_id: String(input.userId),
        ...(input.variant != null && input.variant !== ''
          ? { pricing_variant: input.variant }
          : {}),
        ...(input.anonId != null && input.anonId !== ''
          ? { anon_id: input.anonId }
          : {}),
        ...(input.surface != null && input.surface !== ''
          ? { surface: input.surface }
          : {}),
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
