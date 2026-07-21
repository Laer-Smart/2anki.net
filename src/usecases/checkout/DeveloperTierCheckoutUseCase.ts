import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import hashToken from '../../lib/misc/hashToken';
import type { IDeveloperTiersRepository } from '../../data_layer/DeveloperTiersRepository';

export interface DeveloperTierCheckoutInput {
  tierKey: string;
  userId: number;
  userEmail: string;
}

export class UnknownDeveloperTierError extends Error {
  constructor(tierKey: string) {
    super(`Unknown developer tier: ${tierKey}`);
    this.name = 'UnknownDeveloperTierError';
  }
}

export class DeveloperTierCheckoutUseCase {
  constructor(
    private readonly stripe: Pick<StripeTypes, 'checkout'>,
    private readonly tiers: IDeveloperTiersRepository
  ) {}

  async execute(input: DeveloperTierCheckoutInput): Promise<{ url: string }> {
    const active = await this.tiers.listActive();
    const tier = active.find((row) => row.tier_key === input.tierKey);
    if (tier == null) {
      throw new UnknownDeveloperTierError(input.tierKey);
    }

    const appUrl = process.env.APP_URL ?? 'https://2anki.net';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${appUrl}/developers`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: input.userEmail,
      subscription_data: { metadata: { user_id: String(input.userId) } },
      metadata: {
        user_id: String(input.userId),
        dev_tier: tier.tier_key,
      },
    });

    console.info('developer_tier.checkout.session_created', {
      user_id: input.userId,
      tier: tier.tier_key,
      session_id_hash: hashToken(session.id ?? ''),
    });

    if (session.url == null) {
      throw new Error('Stripe returned a session without a URL');
    }
    return { url: session.url };
  }
}

export default DeveloperTierCheckoutUseCase;
