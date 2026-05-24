import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import type { PassKind } from '../../data_layer/UserPassRepository';

export interface CreatePassCheckoutResult {
  url: string;
}

export class CreatePassCheckoutUseCase {
  constructor(
    private readonly stripe: Pick<StripeTypes, 'checkout'>,
    private readonly priceId: string,
    private readonly passKind: PassKind
  ) {}

  async execute(input: {
    userEmail?: string;
    userId?: number;
    stripeCustomerId?: string | null;
  }): Promise<CreatePassCheckoutResult> {
    const appUrl = process.env.APP_URL ?? 'https://2anki.net';
    const isAnonymous = input.userId == null;

    const successUrl = isAnonymous
      ? `${appUrl}/upload?pass_session={CHECKOUT_SESSION_ID}`
      : `${appUrl}/upload?from=pass`;

    const metadata: Record<string, string> = { pass_kind: this.passKind };
    if (isAnonymous) {
      metadata.pass_anonymous = '1';
    } else {
      metadata.user_id = String(input.userId);
    }

    const sessionParams: StripeTypes.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [{ price: this.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${appUrl}/pricing`,
      metadata,
    };

    if (!isAnonymous) {
      sessionParams.customer_email =
        input.stripeCustomerId == null ? input.userEmail : undefined;
      sessionParams.customer = input.stripeCustomerId ?? undefined;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return { url: session.url! };
  }
}
