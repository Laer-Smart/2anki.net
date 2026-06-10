import Stripe from 'stripe';

import { CreatePricingV2PricesUseCase } from './CreatePricingV2PricesUseCase';
import {
  PRICING_AMOUNTS,
  V2_ANNUAL_LOOKUP_KEY,
  V2_MONTHLY_LOOKUP_KEY,
} from '../checkout/pricingV2';

type StripeClient = InstanceType<typeof Stripe>;

type StripeStub = {
  products: { list: jest.Mock; create: jest.Mock };
  prices: {
    list: jest.Mock;
    create: jest.Mock;
    update?: jest.Mock;
    del?: jest.Mock;
  };
};

const makeStripe = (overrides: Partial<StripeStub> = {}): StripeClient => {
  const stub: StripeStub = {
    products: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn(),
    },
    prices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
    },
    ...overrides,
  };
  return stub as unknown as StripeClient;
};

const existingProduct = { id: 'prod_unlimited', name: 'Unlimited' };

describe('CreatePricingV2PricesUseCase', () => {
  it('creates both v2 prices on the existing Unlimited product when neither exists', async () => {
    const stripe = makeStripe({
      products: {
        list: jest.fn().mockResolvedValue({ data: [existingProduct] }),
        create: jest.fn(),
      },
      prices: {
        list: jest.fn().mockResolvedValue({ data: [] }),
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'price_monthly', livemode: false })
          .mockResolvedValueOnce({ id: 'price_annual', livemode: false }),
        update: jest.fn(),
        del: jest.fn(),
      },
    });

    const result = await new CreatePricingV2PricesUseCase(stripe).execute();

    expect(result.livemode).toBe(false);
    expect(result.prices).toEqual([
      {
        lookupKey: V2_MONTHLY_LOOKUP_KEY,
        status: 'created',
        priceId: 'price_monthly',
        unitAmount: PRICING_AMOUNTS.v2.monthly,
        interval: 'month',
      },
      {
        lookupKey: V2_ANNUAL_LOOKUP_KEY,
        status: 'created',
        priceId: 'price_annual',
        unitAmount: PRICING_AMOUNTS.v2.annual,
        interval: 'year',
      },
    ]);
  });

  it('passes the right create params and reuses the Unlimited product', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'price_x', livemode: true });
    const productsCreate = jest.fn();
    const stripe = makeStripe({
      products: {
        list: jest.fn().mockResolvedValue({ data: [existingProduct] }),
        create: productsCreate,
      },
      prices: {
        list: jest.fn().mockResolvedValue({ data: [] }),
        create,
        update: jest.fn(),
        del: jest.fn(),
      },
    });

    await new CreatePricingV2PricesUseCase(stripe).execute();

    expect(productsCreate).not.toHaveBeenCalled();
    expect(create).toHaveBeenNthCalledWith(1, {
      product: 'prod_unlimited',
      currency: 'usd',
      unit_amount: PRICING_AMOUNTS.v2.monthly,
      nickname: 'Unlimited Monthly v2',
      lookup_key: V2_MONTHLY_LOOKUP_KEY,
      recurring: { interval: 'month' },
      metadata: { version: 'v2', created: '2026-06' },
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      product: 'prod_unlimited',
      currency: 'usd',
      unit_amount: PRICING_AMOUNTS.v2.annual,
      nickname: 'Unlimited Annual v2',
      lookup_key: V2_ANNUAL_LOOKUP_KEY,
      recurring: { interval: 'year' },
      metadata: { version: 'v2', created: '2026-06' },
    });
  });

  it('skips creation when a price with the lookup key already exists', async () => {
    const create = jest.fn();
    const stripe = makeStripe({
      products: {
        list: jest.fn().mockResolvedValue({ data: [existingProduct] }),
        create: jest.fn(),
      },
      prices: {
        list: jest.fn().mockImplementation(({ lookup_keys }) => {
          if (lookup_keys?.[0] === V2_MONTHLY_LOOKUP_KEY) {
            return Promise.resolve({
              data: [{ id: 'price_existing_monthly', livemode: true }],
            });
          }
          return Promise.resolve({ data: [] });
        }),
        create: create.mockResolvedValue({
          id: 'price_annual',
          livemode: true,
        }),
        update: jest.fn(),
        del: jest.fn(),
      },
    });

    const result = await new CreatePricingV2PricesUseCase(stripe).execute();

    expect(result.prices[0]).toEqual({
      lookupKey: V2_MONTHLY_LOOKUP_KEY,
      status: 'already_exists',
      priceId: 'price_existing_monthly',
      unitAmount: PRICING_AMOUNTS.v2.monthly,
      interval: 'month',
    });
    expect(result.prices[1].status).toBe('created');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('never mutates or deletes existing prices, products, or subscriptions', async () => {
    const update = jest.fn();
    const del = jest.fn();
    const productsCreate = jest.fn();
    const stripe = makeStripe({
      products: {
        list: jest.fn().mockResolvedValue({ data: [existingProduct] }),
        create: productsCreate,
      },
      prices: {
        list: jest.fn().mockResolvedValue({
          data: [{ id: 'price_existing', livemode: true }],
        }),
        create: jest.fn(),
        update,
        del,
      },
    });

    await new CreatePricingV2PricesUseCase(stripe).execute();

    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(productsCreate).not.toHaveBeenCalled();
  });
});
