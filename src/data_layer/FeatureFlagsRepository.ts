import type { Knex } from 'knex';

export interface FeatureFlag {
  key: string;
  value: boolean;
  description: string | null;
  updated_at: string | null;
  updated_by: number | null;
}

export interface FeatureFlagWithEmail extends FeatureFlag {
  updated_by_email: string | null;
}

export interface IFeatureFlagsRepository {
  getAll(): Promise<FeatureFlagWithEmail[]>;
  get(key: string): Promise<boolean | null>;
  set(
    key: string,
    value: boolean,
    userId: number
  ): Promise<FeatureFlagWithEmail | null>;
}

interface FlagJoinRow {
  key: string;
  value: boolean;
  description: string | null;
  updated_at: Date | string | null;
  updated_by: number | null;
  updated_by_email: string | null;
}

const toIso = (value: Date | string | null): string | null => {
  if (value == null) return null;
  return typeof value === 'string' ? value : value.toISOString();
};

const mapRow = (row: FlagJoinRow): FeatureFlagWithEmail => ({
  key: row.key,
  value: row.value === true,
  description: row.description,
  updated_at: toIso(row.updated_at),
  updated_by: row.updated_by,
  updated_by_email: row.updated_by_email,
});

export class FeatureFlagsRepository implements IFeatureFlagsRepository {
  private readonly table = 'feature_flags';
  private readonly users = 'users';

  constructor(private readonly database: Knex) {}

  async getAll(): Promise<FeatureFlagWithEmail[]> {
    const rows = (await this.database(`${this.table} as f`)
      .leftJoin(`${this.users} as u`, 'f.updated_by', 'u.id')
      .select(
        'f.key',
        'f.value',
        'f.description',
        'f.updated_at',
        'f.updated_by',
        { updated_by_email: 'u.email' }
      )
      .orderBy('f.key', 'asc')) as FlagJoinRow[];
    return rows.map(mapRow);
  }

  async get(key: string): Promise<boolean | null> {
    const row = (await this.database(this.table)
      .where({ key })
      .select('value')
      .first()) as { value: boolean } | undefined;
    if (row == null) return null;
    return row.value === true;
  }

  async set(
    key: string,
    value: boolean,
    userId: number
  ): Promise<FeatureFlagWithEmail | null> {
    const updated = await this.database(this.table).where({ key }).update({
      value,
      updated_by: userId,
      updated_at: this.database.fn.now(),
    });
    if (updated === 0) return null;
    const rows = (await this.database(`${this.table} as f`)
      .leftJoin(`${this.users} as u`, 'f.updated_by', 'u.id')
      .where('f.key', key)
      .select(
        'f.key',
        'f.value',
        'f.description',
        'f.updated_at',
        'f.updated_by',
        { updated_by_email: 'u.email' }
      )
      .limit(1)) as FlagJoinRow[];
    const row = rows[0];
    return row == null ? null : mapRow(row);
  }
}

export default FeatureFlagsRepository;
