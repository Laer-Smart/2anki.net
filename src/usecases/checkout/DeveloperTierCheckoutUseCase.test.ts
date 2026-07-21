import { DeveloperTierCheckoutUseCase } from './DeveloperTierCheckoutUseCase';
import type { IDeveloperTiersRepository } from '../../data_layer/DeveloperTiersRepository';

jest.mock('../../lib/misc/hashToken', () => (s: string) => `hashed:${s}`);

const STARTER = {
  tier_key: 'starter',
  stripe_product_id: 'prod_starter',
  stripe_price_id: 'price_starter',
  monthly_card_limit: 5000,
  requests_per_minute: 30,
  active: true,
};

function makeRepo(
  tiers = [STARTER]
): jest.Mocked<IDeveloperTiersRepository> {
  return {
    listActive: jest.fn().mockResolvedValue(tiers),
    upsert: jest.fn(),
  };
}

function makeStripe() {
  return {
    checkout: {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'cs_1', url: 'https://stripe/session' }),
      },
    },
  };
}

describe('DeveloperTierCheckoutUseCase', () => {
  it('creates a subscription session for a known tier', async () => {
    const stripe = makeStripe();
    const useCase = new DeveloperTierCheckoutUseCase(
      stripe as never,
      makeRepo()
    );

    const result = await useCase.execute({
      tierKey: 'starter',
      userId: 7,
      userEmail: 'dev@example.com',
    });

    expect(result.url).toBe('https://stripe/session');
    const params = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.line_items).toEqual([
      { price: 'price_starter', quantity: 1 },
    ]);
    expect(params.metadata.dev_tier).toBe('starter');
  });

  it('rejects an unknown tier key', async () => {
    const useCase = new DeveloperTierCheckoutUseCase(
      makeStripe() as never,
      makeRepo()
    );

    await expect(
      useCase.execute({
        tierKey: 'enterprise',
        userId: 7,
        userEmail: 'dev@example.com',
      })
    ).rejects.toThrow('Unknown developer tier');
  });
});
