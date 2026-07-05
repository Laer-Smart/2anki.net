import { Knex } from 'knex';

import {
  AnkifyConflictResolution,
  AnkifySyncConflict,
  NewAnkifySyncConflict,
} from '../../entities/ankify';

const TABLE = 'ankify_sync_conflicts';

const fromRow = (row: AnkifySyncConflict): AnkifySyncConflict => ({
  ...row,
  anki_note_id: Number(row.anki_note_id),
  anki_modified_at:
    row.anki_modified_at == null ? null : Number(row.anki_modified_at),
});

export interface AnkifySyncConflictsRepositoryInterface {
  recordOrFindPending(
    input: NewAnkifySyncConflict
  ): Promise<AnkifySyncConflict>;
  listByOwner(
    owner: number,
    options?: { status?: string }
  ): Promise<AnkifySyncConflict[]>;
  findById(id: number, owner: number): Promise<AnkifySyncConflict | null>;
  resolve(
    id: number,
    owner: number,
    resolution: AnkifyConflictResolution
  ): Promise<void>;
  hasPending(ankifyClientId: number, sourceId: string): Promise<boolean>;
}

export class AnkifySyncConflictsRepository implements AnkifySyncConflictsRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async recordOrFindPending(
    input: NewAnkifySyncConflict
  ): Promise<AnkifySyncConflict> {
    const existing = await this.database<AnkifySyncConflict>(TABLE)
      .select('*')
      .where({
        ankify_client_id: input.ankify_client_id,
        source_id: input.source_id,
        status: 'pending',
      })
      .first();
    if (existing != null) {
      return fromRow(existing);
    }
    const [row] = await this.database<AnkifySyncConflict>(TABLE)
      .insert({
        owner: input.owner,
        ankify_client_id: input.ankify_client_id,
        subscription_id: input.subscription_id,
        source_id: input.source_id,
        anki_note_id: input.anki_note_id,
        kind: input.kind,
        notion_last_edited_at: input.notion_last_edited_at,
        anki_modified_at: input.anki_modified_at,
        notion_snapshot: JSON.stringify(
          input.notion_snapshot
        ) as unknown as object,
        anki_snapshot: JSON.stringify(input.anki_snapshot) as unknown as object,
        status: 'pending',
      })
      .returning('*');
    return fromRow(row);
  }

  async listByOwner(
    owner: number,
    options: { status?: string } = {}
  ): Promise<AnkifySyncConflict[]> {
    const query = this.database<AnkifySyncConflict>(TABLE)
      .select('*')
      .where({ owner })
      .orderBy('created_at', 'desc');
    if (options.status != null) {
      query.andWhere('status', options.status);
    }
    const rows = await query;
    return rows.map(fromRow);
  }

  async findById(
    id: number,
    owner: number
  ): Promise<AnkifySyncConflict | null> {
    const row = await this.database<AnkifySyncConflict>(TABLE)
      .select('*')
      .where({ id, owner })
      .first();
    return row == null ? null : fromRow(row);
  }

  async resolve(
    id: number,
    owner: number,
    resolution: AnkifyConflictResolution
  ): Promise<void> {
    const status = resolution === 'dismissed' ? 'dismissed' : 'resolved';
    await this.database(TABLE)
      .update({
        status,
        resolution,
        resolved_at: this.database.fn.now() as unknown as Date,
      })
      .where({ id, owner });
  }

  async hasPending(ankifyClientId: number, sourceId: string): Promise<boolean> {
    const row = await this.database(TABLE)
      .select('id')
      .where({
        ankify_client_id: ankifyClientId,
        source_id: sourceId,
        status: 'pending',
      })
      .first();
    return row != null;
  }
}
