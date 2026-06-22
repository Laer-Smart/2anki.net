import { ArchiveLegacyPricesUseCase } from './ArchiveLegacyPricesUseCase';

type RetrieveMock = jest.Mock;
type UpdateMock = jest.Mock;

function makeStripe(retrieve: RetrieveMock, update: UpdateMock) {
  return {
    prices: {
      retrieve,
      update,
    },
  } as unknown as ConstructorParameters<typeof ArchiveLegacyPricesUseCase>[0];
}

function legacyPrice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'price_legacy_monthly',
    lookup_key: 'legacy_monthly',
    unit_amount: 600,
    recurring: { interval: 'month' },
    active: true,
    livemode: true,
    ...overrides,
  };
}

describe('ArchiveLegacyPricesUseCase', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      UNLIMITED_MONTHLY_PRICE_ID: 'price_legacy_monthly',
      UNLIMITED_YEARLY_PRICE_ID: 'price_legacy_yearly',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('reports would_archive without calling update in dry-run mode', async () => {
    const retrieve = jest.fn().mockImplementation((id: string) =>
      Promise.resolve(
        id === 'price_legacy_monthly'
          ? legacyPrice()
          : legacyPrice({
              id: 'price_legacy_yearly',
              lookup_key: 'legacy_yearly',
              unit_amount: 6000,
              recurring: { interval: 'year' },
            })
      )
    );
    const update = jest.fn();
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(true);

    expect(update).not.toHaveBeenCalled();
    expect(result.livemode).toBe(true);
    expect(result.prices).toEqual([
      {
        priceId: 'price_legacy_monthly',
        lookupKey: 'legacy_monthly',
        unitAmount: 600,
        interval: 'month',
        active: true,
        action: 'would_archive',
      },
      {
        priceId: 'price_legacy_yearly',
        lookupKey: 'legacy_yearly',
        unitAmount: 6000,
        interval: 'year',
        active: true,
        action: 'would_archive',
      },
    ]);
  });

  it('calls prices.update with active false and reports archived when not a dry run', async () => {
    const retrieve = jest.fn().mockResolvedValue(legacyPrice());
    const update = jest.fn().mockResolvedValue(legacyPrice({ active: false }));
    process.env.UNLIMITED_YEARLY_PRICE_ID = '';
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(false);

    expect(update).toHaveBeenCalledWith('price_legacy_monthly', {
      active: false,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.prices[0]).toEqual({
      priceId: 'price_legacy_monthly',
      lookupKey: 'legacy_monthly',
      unitAmount: 600,
      interval: 'month',
      active: true,
      action: 'archived',
    });
  });

  it('reports already_archived without calling update when the price is inactive', async () => {
    const retrieve = jest
      .fn()
      .mockResolvedValue(legacyPrice({ active: false }));
    const update = jest.fn();
    process.env.UNLIMITED_YEARLY_PRICE_ID = '';
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(false);

    expect(update).not.toHaveBeenCalled();
    expect(result.prices[0].action).toBe('already_archived');
    expect(result.prices[0].active).toBe(false);
  });

  it('NEVER archives a price whose lookup_key is a v2 key, reporting skipped_guard', async () => {
    const retrieve = jest
      .fn()
      .mockResolvedValue(legacyPrice({ lookup_key: 'v2_monthly' }));
    const update = jest.fn();
    process.env.UNLIMITED_YEARLY_PRICE_ID = '';
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(false);

    expect(update).not.toHaveBeenCalled();
    expect(result.prices[0].action).toBe('skipped_guard');
  });

  it('guards the v2 annual lookup_key too', async () => {
    const retrieve = jest
      .fn()
      .mockResolvedValue(legacyPrice({ lookup_key: 'v2_annual' }));
    const update = jest.fn();
    process.env.UNLIMITED_YEARLY_PRICE_ID = '';
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(false);

    expect(update).not.toHaveBeenCalled();
    expect(result.prices[0].action).toBe('skipped_guard');
  });

  it('skips a configured id whose env var is empty, never retrieving it', async () => {
    const retrieve = jest.fn();
    const update = jest.fn();
    process.env.UNLIMITED_MONTHLY_PRICE_ID = '';
    process.env.UNLIMITED_YEARLY_PRICE_ID = '';
    const useCase = new ArchiveLegacyPricesUseCase(
      makeStripe(retrieve, update)
    );

    const result = await useCase.execute(true);

    expect(retrieve).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result.prices).toEqual([
      {
        priceId: '',
        lookupKey: null,
        unitAmount: null,
        interval: null,
        active: null,
        action: 'skipped_missing_env',
      },
      {
        priceId: '',
        lookupKey: null,
        unitAmount: null,
        interval: null,
        active: null,
        action: 'skipped_missing_env',
      },
    ]);
  });
});
