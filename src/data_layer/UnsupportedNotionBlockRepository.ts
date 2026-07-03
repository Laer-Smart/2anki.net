import type { Knex } from 'knex';

export interface UnsupportedNotionBlockRow {
  block_type: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
}

interface UnsupportedBlockUpsertRow {
  block_type: string;
  occurrences: number;
}

export interface IUnsupportedNotionBlockRepository {
  record(types: string[]): Promise<void>;
  list(): Promise<UnsupportedNotionBlockRow[]>;
}

const countByType = (types: string[]): UnsupportedBlockUpsertRow[] => {
  const counts = new Map<string, number>();
  for (const type of types) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts].map(([block_type, occurrences]) => ({
    block_type,
    occurrences,
  }));
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

export class UnsupportedNotionBlockRepository implements IUnsupportedNotionBlockRepository {
  private readonly table = 'unsupported_notion_blocks';

  constructor(private readonly database: Knex) {}

  buildRecordQuery(rows: UnsupportedBlockUpsertRow[]): Knex.QueryBuilder {
    return this.database(this.table)
      .insert(rows)
      .onConflict('block_type')
      .merge({
        occurrences: this.database.raw('?? + excluded.occurrences', [
          `${this.table}.occurrences`,
        ]),
        last_seen: this.database.fn.now(),
      });
  }

  async record(types: string[]): Promise<void> {
    const rows = countByType(types);
    if (rows.length === 0) {
      return;
    }
    await this.buildRecordQuery(rows);
  }

  async list(): Promise<UnsupportedNotionBlockRow[]> {
    const rows = await this.database(this.table)
      .select('block_type', 'occurrences', 'first_seen', 'last_seen')
      .orderBy('occurrences', 'desc');
    return rows.map((row: Record<string, unknown>) => ({
      block_type: row.block_type as string,
      occurrences: Number(row.occurrences),
      first_seen: toIso(row.first_seen),
      last_seen: toIso(row.last_seen),
    }));
  }
}

export default UnsupportedNotionBlockRepository;
