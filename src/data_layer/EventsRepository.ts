import type { Knex } from 'knex';

export interface EventRow {
  name: string;
  user_id?: number | null;
  anonymous_id?: string | null;
  props: Record<string, unknown>;
  created_at?: Date;
}

export interface EventCountRow {
  count: number;
}

export interface PaywallShownByVariantRow {
  variant: string | null;
  surface: string | null;
  distinct_users: number;
}

export interface PaywallClicksByVariantRow {
  variant: string | null;
  click_count: number;
}

export interface UploadFunnelStageRow {
  stage: string;
  distinct_identities: number;
}

const UPLOAD_FUNNEL_STAGES = [
  'upload_started',
  'conversion_succeeded',
  'conversion_failed',
  'deck_downloaded',
];

export interface IEventsRepository {
  insertEvents(rows: EventRow[]): Promise<void>;
  countByName(name: string, since: Date): Promise<number>;
  countDistinctUsers(name: string, since: Date): Promise<number>;
  countByNameForUser(
    name: string,
    since: Date,
    userId: number | null,
    anonymousId: string | null
  ): Promise<number>;
  groupPaywallShownByVariantAndSurface(
    since: Date
  ): Promise<PaywallShownByVariantRow[]>;
  groupPaywallClicksByVariant(
    since: Date
  ): Promise<PaywallClicksByVariantRow[]>;
  groupUploadFunnel(since: Date): Promise<UploadFunnelStageRow[]>;
}

export class EventsRepository implements IEventsRepository {
  private readonly table = 'events';

  constructor(private readonly database: Knex) {}

  async insertEvents(rows: EventRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.database(this.table).insert(rows);
  }

  async countByName(name: string, since: Date): Promise<number> {
    const result = await this.database(this.table)
      .where('name', name)
      .where('created_at', '>=', since)
      .count('id as count')
      .first();
    return Number(result?.count ?? 0);
  }

  async countDistinctUsers(name: string, since: Date): Promise<number> {
    const result = await this.database(this.table)
      .where('name', name)
      .where('created_at', '>=', since)
      .whereNotNull('user_id')
      .countDistinct('user_id as count')
      .first();
    return Number(result?.count ?? 0);
  }

  async countByNameForUser(
    name: string,
    since: Date,
    userId: number | null,
    anonymousId: string | null
  ): Promise<number> {
    const query = this.database(this.table)
      .where('name', name)
      .where('created_at', '>=', since);

    if (userId != null) {
      query.where('user_id', userId);
    } else if (anonymousId != null) {
      query.where('anonymous_id', anonymousId);
    } else {
      return 0;
    }

    const result = await query.count('id as count').first();
    return Number(result?.count ?? 0);
  }

  async groupPaywallShownByVariantAndSurface(
    since: Date
  ): Promise<PaywallShownByVariantRow[]> {
    const rows = (await this.database(this.table)
      .where('name', 'paywall_shown')
      .where('created_at', '>=', since)
      .select(
        this.database.raw("props->>'variant' as variant"),
        this.database.raw("props->>'surface' as surface"),
        this.database.raw(
          'count(distinct COALESCE(user_id::text, anonymous_id)) as distinct_users'
        )
      )
      .groupByRaw("props->>'variant', props->>'surface'")) as Array<{
      variant: string | null;
      surface: string | null;
      distinct_users: string | number;
    }>;

    return rows.map((r) => ({
      variant: r.variant ?? null,
      surface: r.surface ?? null,
      distinct_users: Number(r.distinct_users),
    }));
  }

  async groupPaywallClicksByVariant(
    since: Date
  ): Promise<PaywallClicksByVariantRow[]> {
    const rows = (await this.database(this.table)
      .where('name', 'paywall_upgrade_clicked')
      .where('created_at', '>=', since)
      .select(this.database.raw("props->>'variant' as variant"))
      .count('id as click_count')
      .groupByRaw("props->>'variant'")) as Array<{
      variant: string | null;
      click_count: string | number;
    }>;

    return rows.map((r) => ({
      variant: r.variant ?? null,
      click_count: Number(r.click_count),
    }));
  }

  async groupUploadFunnel(since: Date): Promise<UploadFunnelStageRow[]> {
    const rows = (await this.database(this.table)
      .whereIn('name', UPLOAD_FUNNEL_STAGES)
      .where('created_at', '>=', since)
      .select(
        this.database.raw('name as stage'),
        this.database.raw(
          'count(distinct COALESCE(user_id::text, anonymous_id)) as distinct_identities'
        )
      )
      .groupBy('name')) as Array<{
      stage: string;
      distinct_identities: string | number;
    }>;

    return rows.map((r) => ({
      stage: r.stage,
      distinct_identities: Number(r.distinct_identities),
    }));
  }
}

export default EventsRepository;
