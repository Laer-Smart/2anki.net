import {
  ResolveDeveloperTierUseCase,
  SANDBOX_TIER,
  LIFETIME_TIER,
} from './ResolveDeveloperTierUseCase';
import type { DeveloperTierRow } from '../../data_layer/DeveloperTiersRepository';

const STARTER: DeveloperTierRow = {
  tier_key: 'starter',
  stripe_product_id: 'prod_starter',
  stripe_price_id: 'price_starter',
  monthly_card_limit: 5000,
  requests_per_minute: 30,
  active: true,
};

const GROWTH: DeveloperTierRow = {
  tier_key: 'growth',
  stripe_product_id: 'prod_growth',
  stripe_price_id: 'price_growth',
  monthly_card_limit: 30000,
  requests_per_minute: 60,
  active: true,
};

function makeUseCase(tiers: DeveloperTierRow[]) {
  return new ResolveDeveloperTierUseCase({
    listActive: jest.fn().mockResolvedValue(tiers),
    upsert: jest.fn(),
  });
}

describe('ResolveDeveloperTierUseCase', () => {
  it('resolves sandbox for a user with no dev-tier subscription', async () => {
    const useCase = makeUseCase([STARTER, GROWTH]);
    const tier = await useCase.execute({
      patreon: false,
      activeProductIds: [],
    });
    expect(tier).toEqual(SANDBOX_TIER);
    expect(tier.monthly_card_limit).toBe(100);
  });

  it('resolves sandbox even when the user has a personal Unlimited sub', async () => {
    const useCase = makeUseCase([STARTER, GROWTH]);
    const tier = await useCase.execute({
      patreon: false,
      activeProductIds: ['prod_unlimited_personal'],
    });
    expect(tier).toEqual(SANDBOX_TIER);
  });

  it('resolves the matching paid tier from an active subscription', async () => {
    const useCase = makeUseCase([STARTER, GROWTH]);
    const tier = await useCase.execute({
      patreon: false,
      activeProductIds: ['prod_starter'],
    });
    expect(tier.tier_key).toBe('starter');
    expect(tier.monthly_card_limit).toBe(5000);
    expect(tier.requests_per_minute).toBe(30);
  });

  it('resolves the highest tier when several match', async () => {
    const useCase = makeUseCase([STARTER, GROWTH]);
    const tier = await useCase.execute({
      patreon: false,
      activeProductIds: ['prod_starter', 'prod_growth'],
    });
    expect(tier.tier_key).toBe('growth');
  });

  it('resolves uncapped lifetime for patreon accounts', async () => {
    const useCase = makeUseCase([STARTER, GROWTH]);
    const tier = await useCase.execute({
      patreon: true,
      activeProductIds: [],
    });
    expect(tier).toEqual(LIFETIME_TIER);
    expect(tier.monthly_card_limit).toBe(Number.POSITIVE_INFINITY);
  });
});
