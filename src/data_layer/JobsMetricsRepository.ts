import type { Knex } from 'knex';

import type {
  ConversionErrorCount,
  FailedConversionsWeekPoint,
} from '../services/ops/ConversionMetricsService';
import { normalizeFailureReasons } from './normalizeFailureReasons';

export interface IJobsMetricsRepository {
  countFreeConversions7d(sevenDaysAgo: Date): Promise<number>;
  countPaidConversions7d(sevenDaysAgo: Date): Promise<number>;
  computeFreeSuccessRate7d(sevenDaysAgo: Date): Promise<number | null>;
  computePaidSuccessRate7d(sevenDaysAgo: Date): Promise<number | null>;
  topFailureReasons7d(sevenDaysAgo: Date): Promise<ConversionErrorCount[]>;
  failedConversionsWeekly(
    earliestStart: Date,
    weekEnd: Date
  ): Promise<Array<{ weekStart: Date; count: number }>>;
}

const NOTION_CONVERSION_TYPES: string[] = ['page', 'database', 'conversion'];

type ConversionTier = 'free' | 'paid';

const PAID_CUSTOMER_FILTER =
  "users.stripe_customer_id IS NOT NULL AND users.stripe_customer_id != ''";
const FREE_CUSTOMER_FILTER =
  "users.stripe_customer_id IS NULL OR users.stripe_customer_id = ''";

export class JobsMetricsRepository implements IJobsMetricsRepository {
  constructor(private readonly database: Knex) {}

  private conversionsForTier(
    sevenDaysAgo: Date,
    tier: ConversionTier
  ): Knex.QueryBuilder {
    const ownerJoin = this.database.raw(
      'CAST(users.id AS TEXT) = "jobs"."owner"'
    );
    return this.database('jobs')
      .join('users', function joinOnUserId() {
        this.on(ownerJoin);
      })
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw(tier === 'paid' ? PAID_CUSTOMER_FILTER : FREE_CUSTOMER_FILTER);
  }

  private async countConversions7d(
    sevenDaysAgo: Date,
    tier: ConversionTier
  ): Promise<number> {
    const result = await this.conversionsForTier(sevenDaysAgo, tier)
      .where('jobs.status', 'done')
      .count('jobs.id as count')
      .first();

    return result?.count ? Number(result.count) : 0;
  }

  private async computeSuccessRate7d(
    sevenDaysAgo: Date,
    tier: ConversionTier
  ): Promise<number | null> {
    const result = await this.conversionsForTier(sevenDaysAgo, tier)
      .whereIn('jobs.status', ['done', 'failed'])
      .select(
        this.database.raw(
          'COUNT(CASE WHEN jobs.status = ? THEN 1 END) as done',
          ['done']
        ),
        this.database.raw('COUNT(*) as total')
      )
      .first();

    if (!result || Number(result.total) === 0) return null;
    return (Number(result.done) / Number(result.total)) * 100;
  }

  async countFreeConversions7d(sevenDaysAgo: Date): Promise<number> {
    return this.countConversions7d(sevenDaysAgo, 'free');
  }

  async countPaidConversions7d(sevenDaysAgo: Date): Promise<number> {
    return this.countConversions7d(sevenDaysAgo, 'paid');
  }

  async computeFreeSuccessRate7d(sevenDaysAgo: Date): Promise<number | null> {
    return this.computeSuccessRate7d(sevenDaysAgo, 'free');
  }

  async computePaidSuccessRate7d(sevenDaysAgo: Date): Promise<number | null> {
    return this.computeSuccessRate7d(sevenDaysAgo, 'paid');
  }

  async topFailureReasons7d(
    sevenDaysAgo: Date
  ): Promise<ConversionErrorCount[]> {
    const results = await this.database('jobs')
      .where('jobs.status', 'failed')
      .where('jobs.created_at', '>=', sevenDaysAgo)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereNotNull('jobs.job_reason_failure')
      .select('jobs.job_reason_failure as reason')
      .count('jobs.id as count')
      .groupBy('jobs.job_reason_failure');

    const rawRows = (
      results as Array<{ reason: string; count: number | string }>
    ).map((row) => ({
      reason: row.reason || 'Unknown',
      count: Number(row.count),
    }));

    return normalizeFailureReasons(rawRows);
  }

  async failedConversionsWeekly(
    earliestStart: Date,
    weekEnd: Date
  ): Promise<Array<{ weekStart: Date; count: number }>> {
    const results = await this.database('jobs')
      .where('jobs.status', 'failed')
      .where('jobs.created_at', '>=', earliestStart)
      .where('jobs.created_at', '<', weekEnd)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .select(
        this.database.raw(`DATE_TRUNC('week', jobs.created_at) AS week_start`),
        this.database.raw('COUNT(*) as count')
      )
      .groupBy('week_start')
      .orderBy('week_start', 'asc');

    return (
      results as Array<{ week_start: Date | string; count: number | string }>
    ).map((row) => ({
      weekStart: new Date(row.week_start),
      count: Number(row.count),
    }));
  }
}

export type { ConversionErrorCount, FailedConversionsWeekPoint };
