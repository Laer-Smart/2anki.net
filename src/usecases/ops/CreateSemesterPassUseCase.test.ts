import { CreateSemesterPassUseCase } from './CreateSemesterPassUseCase';

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
        id: 'prod_created_semester',
        metadata: params.metadata,
      })),
    },
    prices: {
      list: jest.fn().mockImplementation(async ({ product }) => ({
        data: prices.filter((price) => price.product === product),
      })),
      create: jest.fn().mockImplementation(async (params) => ({
        id: `price_created_${params.product}`,
        unit_amount: params.unit_amount,
        currency: params.currency,
        recurring: params.recurring ?? null,
      })),
    },
  };
}

describe('CreateSemesterPassUseCase', () => {
  it('creates the product and a one-time price when neither exists', async () => {
    const stripe = makeStripe();
    const useCase = new CreateSemesterPassUseCase(stripe as never);

    const result = await useCase.execute();

    expect(stripe.products.create).toHaveBeenCalledTimes(1);
    expect(stripe.prices.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      stripe_product_id: 'prod_created_semester',
      stripe_price_id: 'price_created_prod_created_semester',
      created_product: true,
      created_price: true,
    });
  });

  it('creates a one-time price with no recurring field', async () => {
    const stripe = makeStripe();
    const useCase = new CreateSemesterPassUseCase(stripe as never);

    await useCase.execute();

    const priceParams = stripe.prices.create.mock.calls[0][0];
    expect(priceParams.unit_amount).toBe(1499);
    expect(priceParams.currency).toBe('usd');
    expect(priceParams.recurring).toBeUndefined();
  });

  it('reuses an existing product found by pass-kind metadata', async () => {
    const stripe = makeStripe({
      products: [
        { id: 'prod_semester', metadata: { '2anki_pass_kind': 'semester' } },
      ],
    });
    const useCase = new CreateSemesterPassUseCase(stripe as never);

    const result = await useCase.execute();

    expect(stripe.products.create).not.toHaveBeenCalled();
    expect(stripe.prices.create).toHaveBeenCalledTimes(1);
    expect(result.stripe_product_id).toBe('prod_semester');
    expect(result.created_product).toBe(false);
    expect(result.created_price).toBe(true);
  });

  it('reuses an existing one-time price by amount and currency', async () => {
    const stripe = makeStripe({
      products: [
        { id: 'prod_semester', metadata: { '2anki_pass_kind': 'semester' } },
      ],
      prices: [
        {
          id: 'price_semester',
          product: 'prod_semester',
          unit_amount: 1499,
          currency: 'usd',
          recurring: null,
        },
      ],
    });
    const useCase = new CreateSemesterPassUseCase(stripe as never);

    const result = await useCase.execute();

    expect(stripe.products.create).not.toHaveBeenCalled();
    expect(stripe.prices.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      stripe_product_id: 'prod_semester',
      stripe_price_id: 'price_semester',
      created_product: false,
      created_price: false,
    });
  });

  it('ignores a recurring price at the same amount and creates a one-time price', async () => {
    const stripe = makeStripe({
      products: [
        { id: 'prod_semester', metadata: { '2anki_pass_kind': 'semester' } },
      ],
      prices: [
        {
          id: 'price_recurring',
          product: 'prod_semester',
          unit_amount: 1499,
          currency: 'usd',
          recurring: { interval: 'month' },
        },
      ],
    });
    const useCase = new CreateSemesterPassUseCase(stripe as never);

    const result = await useCase.execute();

    expect(stripe.prices.create).toHaveBeenCalledTimes(1);
    expect(result.created_price).toBe(true);
  });
});
