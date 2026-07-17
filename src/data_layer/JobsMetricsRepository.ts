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
  countFreePlanBlocked7d(sevenDaysAgo: Date): Promise<number>;
  countPaidPlanBlocked7d(sevenDaysAgo: Date): Promise<number>;
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
  "(users.stripe_customer_id IS NULL OR users.stripe_customer_id = '')";

const PLAN_LIMIT_REASON_PATTERN = '%"code":"monthly_limit"%';
// Empty-deck outcomes are not engine failures: the conversion ran fine, the
// input simply had no card-yielding toggles. Excluded from the success-rate
// denominator alongside plan blocks so user-content outcomes don't trip the
// pipeline-health floor. Prefix matches EMPTY_DECK_FAILURE_REASON, the same
// prefix normalizeFailureReasons keys the empty_deck code on.
const EMPTY_DECK_REASON_PATTERN = 'No cards in this deck yet.%';

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
        this.database.raw(
          'COUNT(CASE WHEN jobs.status = ? AND (jobs.job_reason_failure IS NULL OR (jobs.job_reason_failure NOT LIKE ? AND jobs.job_reason_failure NOT LIKE ?)) THEN 1 END) as technical',
          ['failed', PLAN_LIMIT_REASON_PATTERN, EMPTY_DECK_REASON_PATTERN]
        )
      )
      .first();

    const done = Number(result?.done ?? 0);
    const technicalFailed = Number(result?.technical ?? 0);
    const denominator = done + technicalFailed;
    if (denominator === 0) return null;
    return (done / denominator) * 100;
  }

  private async countPlanBlocked7d(
    sevenDaysAgo: Date,
    tier: ConversionTier
  ): Promise<number> {
    const result = await this.conversionsForTier(sevenDaysAgo, tier)
      .where('jobs.status', 'failed')
      .whereRaw('jobs.job_reason_failure LIKE ?', [PLAN_LIMIT_REASON_PATTERN])
      .count('jobs.id as count')
      .first();

    return result?.count ? Number(result.count) : 0;
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

  async countFreePlanBlocked7d(sevenDaysAgo: Date): Promise<number> {
    return this.countPlanBlocked7d(sevenDaysAgo, 'free');
  }

  async countPaidPlanBlocked7d(sevenDaysAgo: Date): Promise<number> {
    return this.countPlanBlocked7d(sevenDaysAgo, 'paid');
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
