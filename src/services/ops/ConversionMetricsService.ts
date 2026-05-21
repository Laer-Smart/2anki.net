import { Knex } from 'knex';

export type ConversionMetricKey =
  | 'free_conversions_7d'
  | 'paid_conversions_7d'
  | 'free_conversion_success_rate_7d'
  | 'paid_conversion_success_rate_7d'
  | 'conversion_errors_7d_top_reasons'
  | 'failed_conversions_weekly';

export interface ConversionErrorCount {
  reason: string;
  count: number;
}

export interface FailedConversionsWeekPoint {
  week: string;
  count: number;
}

export interface ConversionMetricsResponse {
  free_conversions_7d: number | null;
  paid_conversions_7d: number | null;
  free_conversion_success_rate_7d: number | null;
  paid_conversion_success_rate_7d: number | null;
  conversion_errors_7d_top_reasons: ConversionErrorCount[] | null;
  failed_conversions_weekly: FailedConversionsWeekPoint[] | null;
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const WEEKLY_HISTORY_WEEKS = 12;

const NOTION_CONVERSION_TYPES: string[] = ['page', 'database', 'conversion'];

export class ConversionMetricsService {
  constructor(private readonly database: Knex) {}

  async getMetrics(): Promise<ConversionMetricsResponse> {
    const now = new Date();
    const sevenDaysAgoMs = now.getTime() - 7 * SECONDS_PER_DAY * 1000;
    const sevenDaysAgo = new Date(sevenDaysAgoMs);

    const [
      freeConversions7d,
      paidConversions7d,
      freeSuccessRate7d,
      paidSuccessRate7d,
      topErrors7d,
      failedConversionsWeekly,
    ] = await Promise.allSettled([
      this.countFreeConversions7d(sevenDaysAgo),
      this.countPaidConversions7d(sevenDaysAgo),
      this.computeFreeSuccessRate7d(sevenDaysAgo),
      this.computePaidSuccessRate7d(sevenDaysAgo),
      this.topFailureReasons7d(sevenDaysAgo),
      this.failedConversionsWeekly(now),
    ]);

    return {
      free_conversions_7d:
        freeConversions7d.status === 'fulfilled' ? freeConversions7d.value : null,
      paid_conversions_7d:
        paidConversions7d.status === 'fulfilled' ? paidConversions7d.value : null,
      free_conversion_success_rate_7d:
        freeSuccessRate7d.status === 'fulfilled' ? freeSuccessRate7d.value : null,
      paid_conversion_success_rate_7d:
        paidSuccessRate7d.status === 'fulfilled' ? paidSuccessRate7d.value : null,
      conversion_errors_7d_top_reasons:
        topErrors7d.status === 'fulfilled' ? topErrors7d.value : null,
      failed_conversions_weekly:
        failedConversionsWeekly.status === 'fulfilled'
          ? failedConversionsWeekly.value
          : null,
    };
  }

  private async countFreeConversions7d(sevenDaysAgo: Date): Promise<number> {
    const result = await this.database('jobs')
      .join('users', 'jobs.owner', '=', 'users.id')
      .where('jobs.status', 'done')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw(
        "users.stripe_customer_id IS NULL OR users.stripe_customer_id = ''"
      )
      .count('jobs.id as count')
      .first();

    return result?.count ? Number(result.count) : 0;
  }

  private async countPaidConversions7d(sevenDaysAgo: Date): Promise<number> {
    const result = await this.database('jobs')
      .join('users', 'jobs.owner', '=', 'users.id')
      .where('jobs.status', 'done')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw("users.stripe_customer_id IS NOT NULL AND users.stripe_customer_id != ''")
      .count('jobs.id as count')
      .first();

    return result?.count ? Number(result.count) : 0;
  }

  private async computeFreeSuccessRate7d(sevenDaysAgo: Date): Promise<number | null> {
    const result = await this.database('jobs')
      .join('users', 'jobs.owner', '=', 'users.id')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw(
        "users.stripe_customer_id IS NULL OR users.stripe_customer_id = ''"
      )
      .whereIn('jobs.status', ['done', 'failed'])
      .select(
        this.database.raw('COUNT(CASE WHEN jobs.status = ? THEN 1 END) as done', [
          'done',
        ]),
        this.database.raw('COUNT(*) as total')
      )
      .first();

    if (!result || Number(result.total) === 0) return null;
    return (Number(result.done) / Number(result.total)) * 100;
  }

  private async computePaidSuccessRate7d(sevenDaysAgo: Date): Promise<number | null> {
    const result = await this.database('jobs')
      .join('users', 'jobs.owner', '=', 'users.id')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw("users.stripe_customer_id IS NOT NULL AND users.stripe_customer_id != ''")
      .whereIn('jobs.status', ['done', 'failed'])
      .select(
        this.database.raw('COUNT(CASE WHEN jobs.status = ? THEN 1 END) as done', [
          'done',
        ]),
        this.database.raw('COUNT(*) as total')
      )
      .first();

    if (!result || Number(result.total) === 0) return null;
    return (Number(result.done) / Number(result.total)) * 100;
  }

  private async topFailureReasons7d(
    sevenDaysAgo: Date
  ): Promise<ConversionErrorCount[]> {
    const results = await this.database('jobs')
      .where('jobs.status', 'failed')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereNotNull('jobs.job_reason_failure')
      .select('jobs.job_reason_failure as reason')
      .count('jobs.id as count')
      .groupBy('jobs.job_reason_failure')
      .orderBy('count', 'desc')
      .limit(10);

    return (results as Array<{ reason: string; count: number | string }>).map((row) => ({
      reason: row.reason || 'Unknown',
      count: Number(row.count),
    }));
  }

  private async failedConversionsWeekly(
    now: Date
  ): Promise<FailedConversionsWeekPoint[]> {
    const weekStarts = this.lastNIsoWeekStartsUtc(now, WEEKLY_HISTORY_WEEKS);
    const weekIndex = new Map<number, FailedConversionsWeekPoint>();

    for (const startMs of weekStarts) {
      weekIndex.set(startMs, {
        week: this.isoDate(startMs),
        count: 0,
      });
    }

    const earliestStart = weekStarts[0];
    const lastStart = weekStarts[weekStarts.length - 1];
    const weekEnd = lastStart + 7 * SECONDS_PER_DAY * 1000;

    const results = await this.database('jobs')
      .where('jobs.status', 'failed')
      .where('jobs.created_at', '>=', new Date(earliestStart))
      .where('jobs.created_at', '<', new Date(weekEnd))
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .select(
        this.database.raw(
          `DATE_TRUNC('week', jobs.created_at) AS week_start`
        ),
        this.database.raw('COUNT(*) as count')
      )
      .groupBy('week_start')
      .orderBy('week_start', 'asc');

    for (const row of results) {
      const weekStartMs = new Date(row.week_start).getTime();
      const bucket = this.isoWeekStartUtcMs(weekStartMs);
      const existing = weekIndex.get(bucket);
      if (existing) {
        existing.count = Number(row.count);
      }
    }

    return weekStarts.map((startMs) => weekIndex.get(startMs) as FailedConversionsWeekPoint);
  }

  private isoDate(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
  }

  private isoWeekStartUtcMs(atMs: number): number {
    const dayStart = this.startOfDayUtcMs(atMs);
    const dow = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (dow + 6) % 7;
    return dayStart - daysSinceMonday * SECONDS_PER_DAY * 1000;
  }

  private startOfDayUtcMs(atMs: number): number {
    const d = new Date(atMs);
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      0,
      0,
      0,
      0
    );
  }

  private lastNIsoWeekStartsUtc(now: Date, n: number): number[] {
    const currentWeekStart = this.isoWeekStartUtcMs(now.getTime());
    const result: number[] = [];
    for (let offset = n - 1; offset >= 0; offset -= 1) {
      result.push(currentWeekStart - offset * 7 * SECONDS_PER_DAY * 1000);
    }
    return result;
  }
}
