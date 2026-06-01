jest.mock('../../lib/misc/hashToken', () => (s: string) => `hashed:${s}`);

import { UnlimitedCheckoutUseCase } from './UnlimitedCheckoutUseCase';

const mockStripeCreateSession = jest.fn();

const makeStripe = () =>
  ({ checkout: { sessions: { create: mockStripeCreateSession } } } as never);

const MONTHLY_PRICE_ID = 'price_unlimited_monthly';
const YEARLY_PRICE_ID = 'price_unlimited_yearly';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('UnlimitedCheckoutUseCase', () => {
  it('creates a Checkout session with the monthly price ID when interval is month', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/month' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    const result = await uc.execute({ userEmail: 'user@example.com', userId: 1, interval: 'month' });

    expect(result).toEqual({ url: 'https://checkout.stripe.com/month' });
    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: MONTHLY_PRICE_ID, quantity: 1 }],
        metadata: { user_id: '1' },
      })
    );
  });

  it('creates a Checkout session with the yearly price ID when interval is year', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/year' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    const result = await uc.execute({ userEmail: 'user@example.com', userId: 2, interval: 'year' });

    expect(result).toEqual({ url: 'https://checkout.stripe.com/year' });
    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: YEARLY_PRICE_ID, quantity: 1 }],
        metadata: { user_id: '2' },
      })
    );
  });

  it('returns the success and cancel URLs', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({ userEmail: 'user@example.com', userId: 3, interval: 'month' });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/upload'),
        cancel_url: expect.stringContaining('/pricing'),
      })
    );
  });

  it('passes stripeCustomerId as customer when present', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({
      userEmail: 'user@example.com',
      userId: 4,
      interval: 'month',
      stripeCustomerId: 'cus_existing',
    });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        customer_email: undefined,
      })
    );
  });

  it('uses customer_email when no stripeCustomerId', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({ userEmail: 'new@example.com', userId: 5, interval: 'month' });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'new@example.com',
        customer: undefined,
      })
    );
  });

  it('emits unlimited.checkout.session_created structured log', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({ userEmail: 'user@example.com', userId: 6, interval: 'month' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('unlimited.checkout.session_created'),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('stamps anon_id into metadata when present', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({
      userEmail: 'user@example.com',
      userId: 8,
      interval: 'month',
      anonId: 'anon-uuid-123',
    });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: '8', anon_id: 'anon-uuid-123' },
      })
    );
  });

  it('omits anon_id from metadata when absent', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({ userEmail: 'user@example.com', userId: 9, interval: 'month' });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: '9' },
      })
    );
  });

  it('stamps surface into metadata when provided', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({
      userEmail: 'user@example.com',
      userId: 10,
      interval: 'month',
      surface: 'pricing_page',
    });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: '10', surface: 'pricing_page' },
      })
    );
  });

  it('omits surface from metadata when absent', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({ userEmail: 'user@example.com', userId: 11, interval: 'month' });

    expect(mockStripeCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: '11' },
      })
    );
  });

  it('does not log raw Stripe customer IDs', async () => {
    mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const uc = new UnlimitedCheckoutUseCase(makeStripe(), MONTHLY_PRICE_ID, YEARLY_PRICE_ID);
    await uc.execute({
      userEmail: 'user@example.com',
      userId: 7,
      interval: 'month',
      stripeCustomerId: 'cus_secret_id',
    });

    const logCalls = consoleSpy.mock.calls.map((c) => JSON.stringify(c));
    for (const call of logCalls) {
      expect(call).not.toContain('cus_secret_id');
    }
    consoleSpy.mockRestore();
  });
});
