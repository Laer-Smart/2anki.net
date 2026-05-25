import { Knex } from 'knex';

export interface ReturnRateWindow {
  '7d': number | null;
  '14d': number | null;
  '30d': number | null;
}

export interface ReturnRateBySourceType {
  source_type: string;
  cohort_size: number;
  returned_7d: number;
  returned_14d: number;
  returned_30d: number;
  return_rate_7d_pct: number | null;
  return_rate_14d_pct: number | null;
  return_rate_30d_pct: number | null;
}

export interface ReturnRateMetricsResponse {
  overall: ReturnRateWindow;
  by_source_type: ReturnRateBySourceType[] | null;
  as_of: string;
}

const CONVERSION_TYPES: string[] = ['page', 'database', 'conversion'];
const SECONDS_PER_DAY = 24 * 60 * 60;
const LOOKBACK_DAYS = 90;

interface CohortMember {
  owner: string;
  source_type: string;
  last_success_at: string;
}

interface ReturnRecord {
  owner: string;
  source_type: string;
  anchor_at: string;
  first_return_at: string;
}

const pct = (num: number, denom: number): number | null => {
  if (denom === 0) return null;
  return (num / denom) * 100;
};

export class ReturnRateMetricsService {
  constructor(private readonly database: Knex) {}

  async getMetrics(): Promise<ReturnRateMetricsResponse> {
    const now = new Date();
    const as_of = now.toISOString();

    let cohort: CohortMember[];
    let returns: ReturnRecord[];

    try {
      [cohort, returns] = await Promise.all([
        this.fetchCohort(now),
        this.fetchReturns(now),
      ]);
    } catch {
      return {
        overall: { '7d': null, '14d': null, '30d': null },
        by_source_type: null,
        as_of,
      };
    }

    if (cohort.length === 0) {
      return {
        overall: { '7d': null, '14d': null, '30d': null },
        by_source_type: null,
        as_of,
      };
    }

    return this.compute(cohort, returns, as_of);
  }

  private fetchCohort(now: Date): Promise<CohortMember[]> {
    const cutoff = new Date(now.getTime() - LOOKBACK_DAYS * SECONDS_PER_DAY * 1000);
    return this.database('jobs')
      .whereIn('type', CONVERSION_TYPES)
      .where('status', 'done')
      .where('created_at', '>=', cutoff)
      .select(
        'owner',
        'type as source_type',
        this.database.raw('MAX(created_at) as last_success_at')
      )
      .groupBy('owner', 'type') as Promise<CohortMember[]>;
  }

  private async fetchReturns(now: Date): Promise<ReturnRecord[]> {
    const cutoff = new Date(now.getTime() - LOOKBACK_DAYS * SECONDS_PER_DAY * 1000);

    const rows = (await this.database('jobs as j1')
      .whereIn('j1.type', CONVERSION_TYPES)
      .where('j1.status', 'done')
      .where('j1.created_at', '>=', cutoff)
      .select(
        'j1.owner',
        'j1.type as source_type',
        'j1.created_at as anchor_at',
        this.database.raw(
          '(SELECT MIN(j2.created_at) FROM jobs j2' +
            ' WHERE j2.owner = j1.owner' +
            ' AND j2.type = j1.type' +
            ' AND j2.status = ?' +
            ' AND j2.created_at > j1.created_at' +
            ') as first_return_at',
          ['done']
        )
      )) as Array<{
      owner: string;
      source_type: string;
      anchor_at: string;
      first_return_at: string | null;
    }>;

    const seen = new Set<string>();
    const result: ReturnRecord[] = [];

    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row.first_return_at == null) continue;
      const key = `${row.owner}::${row.source_type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        owner: row.owner,
        source_type: row.source_type,
        anchor_at: row.anchor_at,
        first_return_at: row.first_return_at,
      });
    }

    return result;
  }

  private compute(
    cohort: CohortMember[],
    returns: ReturnRecord[],
    as_of: string
  ): ReturnRateMetricsResponse {
    const returnMap = new Map<string, { gapMs: number }>();
    for (const r of returns) {
      const key = `${r.owner}::${r.source_type}`;
      const gapMs = new Date(r.first_return_at).getTime() - new Date(r.anchor_at).getTime();
      const existing = returnMap.get(key);
      if (existing == null || gapMs < existing.gapMs) {
        returnMap.set(key, { gapMs });
      }
    }

    const sourceMap = new Map<
      string,
      { cohort: number; r7: number; r14: number; r30: number }
    >();

    let totalCohort = 0;
    let totalR7 = 0;
    let totalR14 = 0;
    let totalR30 = 0;

    for (const member of cohort) {
      const key = `${member.owner}::${member.source_type}`;
      const ret = returnMap.get(key);
      const gapMs = ret?.gapMs ?? Infinity;

      const returned7 = gapMs <= 7 * SECONDS_PER_DAY * 1000 ? 1 : 0;
      const returned14 = gapMs <= 14 * SECONDS_PER_DAY * 1000 ? 1 : 0;
      const returned30 = gapMs <= 30 * SECONDS_PER_DAY * 1000 ? 1 : 0;

      totalCohort += 1;
      totalR7 += returned7;
      totalR14 += returned14;
      totalR30 += returned30;

      const existing = sourceMap.get(member.source_type) ?? {
        cohort: 0,
        r7: 0,
        r14: 0,
        r30: 0,
      };
      existing.cohort += 1;
      existing.r7 += returned7;
      existing.r14 += returned14;
      existing.r30 += returned30;
      sourceMap.set(member.source_type, existing);
    }

    const by_source_type: ReturnRateBySourceType[] = [];
    for (const [source_type, counts] of sourceMap) {
      by_source_type.push({
        source_type,
        cohort_size: counts.cohort,
        returned_7d: counts.r7,
        returned_14d: counts.r14,
        returned_30d: counts.r30,
        return_rate_7d_pct: pct(counts.r7, counts.cohort),
        return_rate_14d_pct: pct(counts.r14, counts.cohort),
        return_rate_30d_pct: pct(counts.r30, counts.cohort),
      });
    }

    return {
      overall: {
        '7d': pct(totalR7, totalCohort),
        '14d': pct(totalR14, totalCohort),
        '30d': pct(totalR30, totalCohort),
      },
      by_source_type: by_source_type.length > 0 ? by_source_type : null,
      as_of,
    };
  }
}
