import { Knex } from 'knex';

import { AnkifySyncLog, NewAnkifySyncLog } from '../../entities/ankify';

const TABLE = 'ankify_sync_logs';

export interface AnkifySyncLogsRepositoryInterface {
  log(input: NewAnkifySyncLog): Promise<AnkifySyncLog>;
  listByOwner(
    owner: number,
    options?: { limit?: number; status?: string }
  ): Promise<AnkifySyncLog[]>;
}

export class AnkifySyncLogsRepository implements AnkifySyncLogsRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async log(input: NewAnkifySyncLog): Promise<AnkifySyncLog> {
    const [row] = await this.database<AnkifySyncLog>(TABLE)
      .insert({
        owner: input.owner,
        kind: input.kind,
        status: input.status,
        message: input.message,
        payload:
          input.payload === undefined
            ? null
            : (JSON.stringify(input.payload) as unknown as object),
      })
      .returning('*');
    return row;
  }

  listByOwner(
    owner: number,
    options: { limit?: number; status?: string } = {}
  ): Promise<AnkifySyncLog[]> {
    const limit = options.limit ?? 100;
    const query = this.database<AnkifySyncLog>(TABLE)
      .select('*')
      .where({ owner })
      .orderBy('created_at', 'desc')
      .limit(limit);
    if (options.status != null) {
      query.andWhere('status', options.status);
    }
    return query;
  }
}
