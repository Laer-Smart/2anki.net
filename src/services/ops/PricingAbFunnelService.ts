import type { Stripe } from 'stripe';

import { getStripe } from '../../lib/integrations/stripe';
import type {
  IEventsRepository,
  PaywallShownByVariantRow,
  PaywallClicksByVariantRow,
} from '../../data_layer/EventsRepository';

export interface PricingVariantRow {
  variant: string;
  users_shown: number;
  upgrade_clicks: number;
  upgrade_click_rate_pct: number;
  paid_conversions: number;
  revenue_cents: number;
}

export interface SurfaceBreakdownRow {
  surface: string;
  distinct_users: number;
}

export interface PricingAbFunnelResponse {
  variants: PricingVariantRow[] | null;
  surface_breakdown: SurfaceBreakdownRow[] | null;
  since: string;
  as_of: string;
  error?: string;
}

const STRIPE_PAGE_LIMIT = 100;
const KNOWN_VARIANTS = ['unlimited-first', 'passes-first', 'minimal'];

interface CheckoutSessionSummary {
  variant: string | null;
  paid: boolean;
  amount_total: number;
}

interface PricingAbFunnelServiceDeps {
  eventsRepo: IEventsRepository;
  stripeFactory?: () => Stripe;
}

export class PricingAbFunnelService {
  private readonly eventsRepo: IEventsRepository;
  private readonly stripeFactory: () => Stripe;

  constructor(deps: PricingAbFunnelServiceDeps) {
    this.eventsRepo = deps.eventsRepo;
    this.stripeFactory = deps.stripeFactory ?? (() => getStripe());
  }

  async getMetrics(since: Date): Promise<PricingAbFunnelResponse> {
    const as_of = new Date().toISOString();
    const sinceStr = since.toISOString();

    let shownRows: PaywallShownByVariantRow[];
    let clickRows: PaywallClicksByVariantRow[];

    try {
      [shownRows, clickRows] = await Promise.all([
        this.eventsRepo.groupPaywallShownByVariantAndSurface(since),
        this.eventsRepo.groupPaywallClicksByVariant(since),
      ]);
    } catch (err) {
      return {
        variants: null,
        surface_breakdown: null,
        since: sinceStr,
        as_of,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const sessions = await this.fetchSessions(since);

    const variants = this.buildVariantRows(shownRows, clickRows, sessions);
    const surface_breakdown = this.buildSurfaceBreakdown(shownRows);

    return { variants, surface_breakdown, since: sinceStr, as_of };
  }

  private buildVariantRows(
    shownRows: PaywallShownByVariantRow[],
    clickRows: PaywallClicksByVariantRow[],
    sessions: CheckoutSessionSummary[]
  ): PricingVariantRow[] {
    const shownByVariant = new Map<string, number>();
    for (const row of shownRows) {
      if (row.variant == null) continue;
      const existing = shownByVariant.get(row.variant) ?? 0;
      shownByVariant.set(row.variant, existing + row.distinct_users);
    }

    const clicksByVariant = new Map<string, number>();
    for (const row of clickRows) {
      if (row.variant == null) continue;
      clicksByVariant.set(row.variant, row.click_count);
    }

    const conversionsByVariant = new Map<
      string,
      { count: number; revenue: number }
    >();
    for (const session of sessions) {
      if (session.variant == null || !session.paid) continue;
      const existing = conversionsByVariant.get(session.variant) ?? {
        count: 0,
        revenue: 0,
      };
      existing.count += 1;
      existing.revenue += session.amount_total;
      conversionsByVariant.set(session.variant, existing);
    }

    const allVariants = new Set<string>([
      ...KNOWN_VARIANTS,
      ...shownByVariant.keys(),
    ]);

    return Array.from(allVariants).map((variant) => {
      const users_shown = shownByVariant.get(variant) ?? 0;
      const upgrade_clicks = clicksByVariant.get(variant) ?? 0;
      const upgrade_click_rate_pct =
        users_shown > 0 ? (upgrade_clicks / users_shown) * 100 : 0;
      const conv = conversionsByVariant.get(variant) ?? {
        count: 0,
        revenue: 0,
      };
      return {
        variant,
        users_shown,
        upgrade_clicks,
        upgrade_click_rate_pct,
        paid_conversions: conv.count,
        revenue_cents: conv.revenue,
      };
    });
  }

  private buildSurfaceBreakdown(
    shownRows: PaywallShownByVariantRow[]
  ): SurfaceBreakdownRow[] {
    const surfaceMap = new Map<string, number>();
    for (const row of shownRows) {
      if (row.surface == null) continue;
      const existing = surfaceMap.get(row.surface) ?? 0;
      surfaceMap.set(row.surface, existing + row.distinct_users);
    }
    return Array.from(surfaceMap.entries()).map(
      ([surface, distinct_users]) => ({
        surface,
        distinct_users,
      })
    );
  }

  private async fetchSessions(since: Date): Promise<CheckoutSessionSummary[]> {
    const stripe = this.stripeFactory();
    const gteSeconds = Math.floor(since.getTime() / 1000);
    const result: CheckoutSessionSummary[] = [];
    let startingAfter: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await stripe.checkout.sessions.list({
        limit: STRIPE_PAGE_LIMIT,
        created: { gte: gteSeconds },
        starting_after: startingAfter,
      });

      for (const session of page.data) {
        const variant =
          typeof session.metadata?.pricing_variant === 'string' &&
          session.metadata.pricing_variant.length > 0
            ? session.metadata.pricing_variant
            : null;
        const paid =
          session.payment_status === 'paid' || session.status === 'complete';
        result.push({
          variant,
          paid,
          amount_total: session.amount_total ?? 0,
        });
      }

      hasMore = page.has_more === true && page.data.length > 0;
      startingAfter = hasMore
        ? (page.data[page.data.length - 1].id ?? undefined)
        : undefined;
    }

    return result;
  }
}
