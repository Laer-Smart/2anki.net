import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import SubscriptionService from '../../services/SubscriptionService';
import hashToken from '../../lib/misc/hashToken';

export type AutoSyncCheckoutResult =
  | { url: string }
  | { status: 'cap_reached' | 'already_subscribed' };

const DEFAULT_MAX_SUBSCRIBERS = 50;

export class AutoSyncCheckoutUseCase {
  private readonly maxSubscribers: number;

  constructor(
    private readonly stripe: Pick<StripeTypes, 'checkout'>,
    private readonly priceId: string,
    private readonly productId: string,
    maxSubscribers?: number
  ) {
    this.maxSubscribers = maxSubscribers ?? DEFAULT_MAX_SUBSCRIBERS;
  }

  async execute(input: {
    userEmail: string;
    userId: number;
    stripeCustomerId?: string | null;
    variant?: string;
    anonId?: string;
  }): Promise<AutoSyncCheckoutResult> {
    console.info('auto_sync.checkout.started', { user_id: input.userId });

    const activeCount = await SubscriptionService.countActiveByProductId(this.productId);
    if (activeCount >= this.maxSubscribers) {
      console.info('auto_sync.checkout.cap_reached', {
        user_id: input.userId,
        active_count: activeCount,
        cap: this.maxSubscribers,
      });
      return { status: 'cap_reached' };
    }

    const existingSubs = await SubscriptionService.getUserActiveSubscriptions(input.userEmail);
    const alreadySubscribed = existingSubs.some(
      (s) => s.active && (s as { stripe_product_id?: string | null }).stripe_product_id === this.productId
    );
    if (alreadySubscribed) {
      console.info('auto_sync.checkout.already_subscribed', { user_id: input.userId });
      return { status: 'already_subscribed' };
    }

    const sessionParams: StripeTypes.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: this.priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL ?? 'https://2anki.net'}/ankify/setup`,
      cancel_url: `${process.env.APP_URL ?? 'https://2anki.net'}/pricing`,
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
      },
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    console.info('auto_sync.checkout.session_created', {
      user_id: input.userId,
      session_id_hash: hashToken(session.id ?? ''),
    });

    return { url: session.url! };
  }
}
