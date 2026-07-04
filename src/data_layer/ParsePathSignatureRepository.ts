import type { Knex } from 'knex';

export interface ParsePathSignatureRow {
  parse_path: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
}

interface ParsePathUpsertRow {
  parse_path: string;
  occurrences: number;
}

export interface IParsePathSignatureRepository {
  record(paths: string[]): Promise<void>;
  list(): Promise<ParsePathSignatureRow[]>;
}

const countByType = (paths: string[]): ParsePathUpsertRow[] => {
  const counts = new Map<string, number>();
  for (const parsePath of paths) {
    counts.set(parsePath, (counts.get(parsePath) ?? 0) + 1);
  }
  return [...counts].map(([parse_path, occurrences]) => ({
    parse_path,
    occurrences,
  }));
};

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

export class ParsePathSignatureRepository implements IParsePathSignatureRepository {
  private readonly table = 'parse_path_signatures';

  constructor(private readonly database: Knex) {}

  buildRecordQuery(rows: ParsePathUpsertRow[]): Knex.QueryBuilder {
    return this.database(this.table)
      .insert(rows)
      .onConflict('parse_path')
      .merge({
        occurrences: this.database.raw('?? + excluded.occurrences', [
          `${this.table}.occurrences`,
        ]),
        last_seen: this.database.fn.now(),
      });
  }

  async record(paths: string[]): Promise<void> {
    const rows = countByType(paths);
    if (rows.length === 0) {
      return;
    }
    await this.buildRecordQuery(rows);
  }

  async list(): Promise<ParsePathSignatureRow[]> {
    const rows = await this.database(this.table)
      .select('parse_path', 'occurrences', 'first_seen', 'last_seen')
      .orderBy('occurrences', 'desc');
    return rows.map((row: Record<string, unknown>) => ({
      parse_path: row.parse_path as string,
      occurrences: Number(row.occurrences),
      first_seen: toIso(row.first_seen),
      last_seen: toIso(row.last_seen),
    }));
  }
}

export default ParsePathSignatureRepository;
