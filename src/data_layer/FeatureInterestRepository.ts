import type { Knex } from 'knex';

export interface FeatureInterestEntry {
  feature_key: string;
  user_id: number | null;
  anonymous_id: string | null;
  comment: string | null;
}

export interface FeatureInterestCount {
  feature_key: string;
  count: number;
}

export interface IFeatureInterestRepository {
  record(entry: FeatureInterestEntry): Promise<void>;
  countByFeatureKey(): Promise<FeatureInterestCount[]>;
}

interface CountRow {
  feature_key: string;
  count: string | number;
}

export class FeatureInterestRepository implements IFeatureInterestRepository {
  private readonly table = 'feature_interest';

  constructor(private readonly database: Knex) {}

  buildRecordQuery(entry: FeatureInterestEntry): Knex.QueryBuilder {
    return this.database(this.table).insert({
      feature_key: entry.feature_key,
      user_id: entry.user_id,
      anonymous_id: entry.anonymous_id,
      comment: entry.comment,
    });
  }

  async record(entry: FeatureInterestEntry): Promise<void> {
    await this.buildRecordQuery(entry);
  }

  buildCountQuery(): Knex.QueryBuilder {
    return this.database(this.table)
      .select('feature_key')
      .count('* as count')
      .groupBy('feature_key')
      .orderBy('count', 'desc');
  }

  async countByFeatureKey(): Promise<FeatureInterestCount[]> {
    const rows = (await this.buildCountQuery()) as CountRow[];
    return rows.map((row) => ({
      feature_key: row.feature_key,
      count: Number(row.count),
    }));
  }
}

export class InMemoryFeatureInterestRepository implements IFeatureInterestRepository {
  private readonly rows: FeatureInterestEntry[] = [];

  async record(entry: FeatureInterestEntry): Promise<void> {
    this.rows.push({ ...entry });
  }

  async countByFeatureKey(): Promise<FeatureInterestCount[]> {
    const counts = new Map<string, number>();
    for (const row of this.rows) {
      counts.set(row.feature_key, (counts.get(row.feature_key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([feature_key, count]) => ({ feature_key, count }))
      .sort((a, b) => b.count - a.count);
  }
}
