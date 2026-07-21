import { CreateDeveloperTiersUseCase } from './CreateDeveloperTiersUseCase';
import type { IDeveloperTiersRepository } from '../../data_layer/DeveloperTiersRepository';

function makeRepo(): jest.Mocked<IDeveloperTiersRepository> {
  return {
    listActive: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
  };
}

interface FakeStripeSeed {
  products?: Array<{ id: string; metadata: Record<string, string> }>;
  prices?: Array<{
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string } | null;
  }>;
}

function makeStripe(seed: FakeStripeSeed = {}) {
  const products = seed.products ?? [];
  const prices = seed.prices ?? [];
  return {
    products: {
      list: jest.fn().mockResolvedValue({ data: products }),
      create: jest.fn().mockImplementation(async (params) => ({
        id: `prod_created_${params.metadata['2anki_dev_tier']}`,
        metadata: params.metadata,
      })),
    },
    prices: {
      list: jest.fn().mockImplementation(async ({ product }) => ({
        data: prices.filter((price) => price.product === product),
      })),
      create: jest.fn().mockImplementation(async (params) => ({
        id: `price_created_${params.product}`,
      })),
    },
  };
}

describe('CreateDeveloperTiersUseCase', () => {
  it('creates both products and prices from scratch', async () => {
    const repo = makeRepo();
    const stripe = makeStripe();
    const useCase = new CreateDeveloperTiersUseCase(stripe as never, repo);

    const result = await useCase.execute();

    expect(stripe.products.create).toHaveBeenCalledTimes(2);
    expect(stripe.prices.create).toHaveBeenCalledTimes(2);
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tier_key: 'starter',
        monthly_card_limit: 5000,
        requests_per_minute: 30,
      })
    );
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tier_key: 'growth',
        monthly_card_limit: 30000,
        requests_per_minute: 60,
      })
    );
    expect(result.map((r) => r.created_product)).toEqual([true, true]);
  });

  it('is idempotent — finds existing products and prices by metadata', async () => {
    const repo = makeRepo();
    const stripe = makeStripe({
      products: [
        { id: 'prod_starter', metadata: { '2anki_dev_tier': 'starter' } },
        { id: 'prod_growth', metadata: { '2anki_dev_tier': 'growth' } },
      ],
      prices: [
        {
          id: 'price_starter',
          product: 'prod_starter',
          unit_amount: 2900,
          currency: 'usd',
          recurring: { interval: 'month' },
        },
        {
          id: 'price_growth',
          product: 'prod_growth',
          unit_amount: 9900,
          currency: 'usd',
          recurring: { interval: 'month' },
        },
      ],
    });
    const useCase = new CreateDeveloperTiersUseCase(stripe as never, repo);

    const result = await useCase.execute();

    expect(stripe.products.create).not.toHaveBeenCalled();
    expect(stripe.prices.create).not.toHaveBeenCalled();
    expect(result.map((r) => r.created_product)).toEqual([false, false]);
    expect(result.map((r) => r.created_price)).toEqual([false, false]);
    expect(repo.upsert).toHaveBeenCalledTimes(2);
  });

  it('creates a fresh price when the existing one has the wrong amount', async () => {
    const repo = makeRepo();
    const stripe = makeStripe({
      products: [
        { id: 'prod_starter', metadata: { '2anki_dev_tier': 'starter' } },
      ],
      prices: [
        {
          id: 'price_old',
          product: 'prod_starter',
          unit_amount: 1900,
          currency: 'usd',
          recurring: { interval: 'month' },
        },
      ],
    });
    const useCase = new CreateDeveloperTiersUseCase(stripe as never, repo);

    const result = await useCase.execute();

    const starter = result.find((r) => r.tier_key === 'starter');
    expect(starter?.created_price).toBe(true);
  });
});
