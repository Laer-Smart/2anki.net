import type { Knex } from 'knex';

export interface ErrorEventInsert {
  source: 'web' | 'server';
  message_hash: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  user_agent?: string | null;
  release?: string | null;
  user_id?: number | null;
  ip_hash?: string | null;
  context?: Record<string, unknown> | null;
}

export interface ErrorGroupRow {
  message_hash: string;
  message: string;
  stack: string | null;
  url: string | null;
  release: string | null;
  source: string;
  user_id: number | null;
  user_agent: string | null;
  first_seen: string;
  last_seen: string;
  occurrences: number;
}

export interface ListErrorGroupsOptions {
  limit: number;
  offset: number;
  source?: 'web' | 'server';
  sort?: 'last_seen' | 'occurrences';
}

export interface IErrorEventRepository {
  insert(row: ErrorEventInsert): Promise<void>;
  existsWithinWindow(messageHash: string, ipHash: string, windowMs: number): Promise<boolean>;
  listGroups(options: ListErrorGroupsOptions): Promise<ErrorGroupRow[]>;
  countGroups(source?: 'web' | 'server'): Promise<number>;
}

export class ErrorEventRepository implements IErrorEventRepository {
  private readonly table = 'error_events';

  constructor(private readonly database: Knex) {}

  async insert(row: ErrorEventInsert): Promise<void> {
    await this.database(this.table).insert(row);
  }

  async existsWithinWindow(messageHash: string, ipHash: string, windowMs: number): Promise<boolean> {
    const since = new Date(Date.now() - windowMs);
    const result = await this.database(this.table)
      .where('message_hash', messageHash)
      .where('ip_hash', ipHash)
      .where('created_at', '>=', since)
      .count('id as count')
      .first();
    return Number(result?.count ?? 0) > 0;
  }

  async listGroups(options: ListErrorGroupsOptions): Promise<ErrorGroupRow[]> {
    const { limit, offset, source, sort } = options;
    const orderCol = sort === 'occurrences' ? 'occurrences' : 'last_seen';

    const query = this.database(this.table)
      .select(
        'message_hash',
        'message',
        this.database.raw('MAX(stack) as stack'),
        this.database.raw('MAX(url) as url'),
        this.database.raw('MAX(release) as release'),
        'source',
        this.database.raw('MAX(user_id) as user_id'),
        this.database.raw('MAX(user_agent) as user_agent'),
        this.database.raw('MIN(created_at) as first_seen'),
        this.database.raw('MAX(created_at) as last_seen'),
        this.database.raw('COUNT(*) as occurrences')
      )
      .groupBy('message_hash', 'message', 'source')
      .orderBy(orderCol, 'desc')
      .limit(limit)
      .offset(offset);

    if (source != null) {
      query.where('source', source);
    }

    const rows = await query;
    return rows.map((r) => ({
      message_hash: r.message_hash as string,
      message: r.message as string,
      stack: r.stack as string | null,
      url: r.url as string | null,
      release: r.release as string | null,
      source: r.source as string,
      user_id: r.user_id != null ? Number(r.user_id) : null,
      user_agent: r.user_agent as string | null,
      first_seen: r.first_seen instanceof Date ? r.first_seen.toISOString() : String(r.first_seen),
      last_seen: r.last_seen instanceof Date ? r.last_seen.toISOString() : String(r.last_seen),
      occurrences: Number(r.occurrences),
    }));
  }

  async countGroups(source?: 'web' | 'server'): Promise<number> {
    const query = this.database(this.table)
      .countDistinct(
        this.database.raw('(message_hash, message, source)') as unknown as string
      )
      .as('total');

    if (source != null) {
      (query as ReturnType<typeof this.database>).where('source', source);
    }

    const result = await this.database
      .count('* as total')
      .from(
        this.database(this.table)
          .modify((q) => {
            if (source != null) q.where('source', source);
          })
          .groupBy('message_hash', 'message', 'source')
          .as('groups')
      )
      .first();
    return Number(result?.total ?? 0);
  }
}
