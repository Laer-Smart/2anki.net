import { StripePriceResolver } from './StripePriceResolver';

const makeStripe = (listImpl: jest.Mock) =>
  ({ prices: { list: listImpl } }) as never;

describe('StripePriceResolver', () => {
  it('resolves a price ID by lookup_key', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [{ id: 'price_v2_monthly_abc' }],
    });
    const resolver = new StripePriceResolver(makeStripe(list));

    const id = await resolver.resolveByLookupKey('v2_monthly');

    expect(id).toBe('price_v2_monthly_abc');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_keys: ['v2_monthly'], active: true })
    );
  });

  it('caches the resolved ID and does not call Stripe twice', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [{ id: 'price_v2_annual_xyz' }],
    });
    const resolver = new StripePriceResolver(makeStripe(list));

    await resolver.resolveByLookupKey('v2_annual');
    const second = await resolver.resolveByLookupKey('v2_annual');

    expect(second).toBe('price_v2_annual_xyz');
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('returns null when no price matches the lookup_key', async () => {
    const list = jest.fn().mockResolvedValue({ data: [] });
    const resolver = new StripePriceResolver(makeStripe(list));

    expect(await resolver.resolveByLookupKey('v2_monthly')).toBeNull();
  });

  it('returns null and does not cache when Stripe throws', async () => {
    const list = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: [{ id: 'price_recovered' }] });
    const resolver = new StripePriceResolver(makeStripe(list));

    expect(await resolver.resolveByLookupKey('v2_monthly')).toBeNull();
    expect(await resolver.resolveByLookupKey('v2_monthly')).toBe(
      'price_recovered'
    );
    expect(list).toHaveBeenCalledTimes(2);
  });
});
