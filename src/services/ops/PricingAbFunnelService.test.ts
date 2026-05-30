import { PricingAbFunnelService } from './PricingAbFunnelService';
import { IEventsRepository } from '../../data_layer/EventsRepository';

const VARIANT_SHOWN_ROWS = [
  { variant: 'unlimited-first', surface: 'pricing_page', distinct_users: 120 },
  { variant: 'passes-first', surface: 'pricing_page', distinct_users: 115 },
  { variant: 'minimal', surface: 'pricing_page', distinct_users: 118 },
  { variant: null, surface: 'upload_success_upsell', distinct_users: 400 },
  { variant: null, surface: 'downloads_upsell', distinct_users: 200 },
];

const VARIANT_CLICK_ROWS = [
  { variant: 'unlimited-first', click_count: 30 },
  { variant: 'passes-first', click_count: 20 },
  { variant: 'minimal', click_count: 15 },
];

const SESSIONS = [
  {
    id: 'cs_1',
    metadata: { pricing_variant: 'unlimited-first' },
    payment_status: 'paid',
    status: 'complete',
    amount_total: 3000,
  },
  {
    id: 'cs_2',
    metadata: { pricing_variant: 'unlimited-first' },
    payment_status: 'unpaid',
    status: 'expired',
    amount_total: 3000,
  },
  {
    id: 'cs_3',
    metadata: { pricing_variant: 'passes-first' },
    payment_status: 'paid',
    status: 'complete',
    amount_total: 1500,
  },
  {
    id: 'cs_4',
    metadata: { pricing_variant: 'minimal' },
    payment_status: 'paid',
    status: 'complete',
    amount_total: 500,
  },
  {
    id: 'cs_5',
    metadata: { pricing_variant: 'minimal' },
    payment_status: 'paid',
    status: 'complete',
    amount_total: 500,
  },
  {
    id: 'cs_6',
    metadata: {},
    payment_status: 'paid',
    status: 'complete',
    amount_total: 9900,
  },
];

function makeStripe(sessions: typeof SESSIONS, hasMore = false) {
  return {
    checkout: {
      sessions: {
        list: jest.fn().mockResolvedValue({ data: sessions, has_more: hasMore }),
      },
    },
  };
}

function makeEventsRepo(
  shownRows = VARIANT_SHOWN_ROWS,
  clickRows = VARIANT_CLICK_ROWS
): IEventsRepository & {
  groupPaywallShownByVariantAndSurface: jest.Mock;
  groupPaywallClicksByVariant: jest.Mock;
} {
  return {
    insertEvents: jest.fn(),
    countByName: jest.fn(),
    countDistinctUsers: jest.fn(),
    countByNameForUser: jest.fn(),
    groupPaywallShownByVariantAndSurface: jest
      .fn()
      .mockResolvedValue(shownRows),
    groupPaywallClicksByVariant: jest.fn().mockResolvedValue(clickRows),
    groupUploadFunnel: jest.fn().mockResolvedValue([]),
  };
}

describe('PricingAbFunnelService', () => {
  describe('getMetrics', () => {
    it('aggregates variant rows correctly', async () => {
      const repo = makeEventsRepo();
      const stripe = makeStripe(SESSIONS);
      const service = new PricingAbFunnelService({
        eventsRepo: repo,
        stripeFactory: () => stripe as never,
      });

      const result = await service.getMetrics(new Date('2026-05-26T00:00:00Z'));

      expect(result.variants).toHaveLength(3);
      const unlimited = result.variants!.find(
        (v) => v.variant === 'unlimited-first'
      );
      expect(unlimited).toMatchObject({
        variant: 'unlimited-first',
        users_shown: 120,
        upgrade_clicks: 30,
        paid_conversions: 1,
        revenue_cents: 3000,
      });
      expect(unlimited?.upgrade_click_rate_pct).toBeCloseTo(25, 1);
    });

    it('handles a variant with no clicks or conversions', async () => {
      const repo = makeEventsRepo(
        [{ variant: 'minimal', surface: 'pricing_page', distinct_users: 50 }],
        []
      );
      const stripe = makeStripe([]);
      const service = new PricingAbFunnelService({
        eventsRepo: repo,
        stripeFactory: () => stripe as never,
      });

      const result = await service.getMetrics(new Date('2026-05-26T00:00:00Z'));

      const minimal = result.variants!.find((v) => v.variant === 'minimal');
      expect(minimal).toMatchObject({
        variant: 'minimal',
        users_shown: 50,
        upgrade_clicks: 0,
        upgrade_click_rate_pct: 0,
        paid_conversions: 0,
        revenue_cents: 0,
      });
    });

    it('includes surface breakdown rows for no-variant events', async () => {
      const repo = makeEventsRepo();
      const stripe = makeStripe(SESSIONS);
      const service = new PricingAbFunnelService({
        eventsRepo: repo,
        stripeFactory: () => stripe as never,
      });

      const result = await service.getMetrics(new Date('2026-05-26T00:00:00Z'));

      expect(result.surface_breakdown!.length).toBeGreaterThan(0);
      const upsell = result.surface_breakdown!.find(
        (r) => r.surface === 'upload_success_upsell'
      );
      expect(upsell?.distinct_users).toBe(400);
    });

    it('paginates Stripe sessions when has_more is true', async () => {
      const stripe = {
        checkout: {
          sessions: {
            list: jest
              .fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    id: 'cs_a',
                    metadata: { pricing_variant: 'minimal' },
                    payment_status: 'paid',
                    status: 'complete',
                    amount_total: 100,
                  },
                ],
                has_more: true,
              })
              .mockResolvedValueOnce({
                data: [
                  {
                    id: 'cs_b',
                    metadata: { pricing_variant: 'minimal' },
                    payment_status: 'paid',
                    status: 'complete',
                    amount_total: 200,
                  },
                ],
                has_more: false,
              }),
          },
        },
      };
      const repo = makeEventsRepo([], []);
      const service = new PricingAbFunnelService({
        eventsRepo: repo,
        stripeFactory: () => stripe as never,
      });

      const result = await service.getMetrics(new Date('2026-05-26T00:00:00Z'));

      const minimal = result.variants!.find((v) => v.variant === 'minimal');
      expect(minimal?.paid_conversions).toBe(2);
      expect(minimal?.revenue_cents).toBe(300);
      expect(stripe.checkout.sessions.list).toHaveBeenCalledTimes(2);
    });

    it('returns null fields when events repo throws', async () => {
      const repo = makeEventsRepo();
      (repo.groupPaywallShownByVariantAndSurface as jest.Mock).mockRejectedValue(
        new Error('DB down')
      );
      const stripe = makeStripe([]);
      const service = new PricingAbFunnelService({
        eventsRepo: repo,
        stripeFactory: () => stripe as never,
      });

      const result = await service.getMetrics(new Date('2026-05-26T00:00:00Z'));

      expect(result.variants).toBeNull();
      expect(result.error).toBe('DB down');
    });
  });
});
