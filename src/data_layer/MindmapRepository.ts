import { Knex } from 'knex';

import Mindmaps, { MindmapsId, MindmapsInitializer } from './public/Mindmaps';
import { UsersId } from './public/Users';

const TABLE = 'mindmaps';

export interface MindmapImageStatsRow {
  total: number;
  with_images: number;
}

export interface MindmapRepositoryInterface {
  create(
    input: Omit<MindmapsInitializer, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Mindmaps>;
  findById(id: MindmapsId, userId: UsersId): Promise<Mindmaps | null>;
  findByUserId(userId: UsersId): Promise<Mindmaps[]>;
  update(
    id: MindmapsId,
    userId: UsersId,
    patch: Partial<Pick<Mindmaps, 'title' | 'data'>>
  ): Promise<Mindmaps | null>;
  delete(id: MindmapsId, userId: UsersId): Promise<void>;
  countByUserId(userId: UsersId): Promise<number>;
  getMindmapImageStats(): Promise<MindmapImageStatsRow>;
}

export class MindmapRepository implements MindmapRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async create(
    input: Omit<MindmapsInitializer, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Mindmaps> {
    const [row] = await this.database(TABLE)
      .insert({
        user_id: input.user_id,
        title: input.title ?? 'Untitled',
        data: input.data ?? { nodes: [], edges: [] },
      })
      .returning<Mindmaps[]>('*');
    return row;
  }

  async findById(id: MindmapsId, userId: UsersId): Promise<Mindmaps | null> {
    const row = await this.database<Mindmaps>(TABLE)
      .select('*')
      .where({ id, user_id: userId })
      .first();
    return row ?? null;
  }

  findByUserId(userId: UsersId): Promise<Mindmaps[]> {
    return this.database<Mindmaps>(TABLE)
      .select('*')
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc');
  }

  async update(
    id: MindmapsId,
    userId: UsersId,
    patch: Partial<Pick<Mindmaps, 'title' | 'data'>>
  ): Promise<Mindmaps | null> {
    const [row] = await this.database<Mindmaps>(TABLE)
      .where({ id, user_id: userId })
      .update({ ...patch, updated_at: new Date() })
      .returning<Mindmaps[]>('*');
    return row ?? null;
  }

  async delete(id: MindmapsId, userId: UsersId): Promise<void> {
    await this.database(TABLE).where({ id, user_id: userId }).del();
  }

  async countByUserId(userId: UsersId): Promise<number> {
    const [result] = await this.database(TABLE)
      .where({ user_id: userId })
      .count('id as count');
    return Number((result as { count: string | number }).count);
  }

  async getMindmapImageStats(): Promise<MindmapImageStatsRow> {
    const result = await this.database.raw<{
      rows: Array<{ total: string; with_images: string }>;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         SUM(
           CASE WHEN EXISTS (
             SELECT 1
             FROM jsonb_array_elements(data->'nodes') AS node
             WHERE node->>'image' IS NOT NULL
               AND node->'image'->>'url' IS NOT NULL
           ) THEN 1 ELSE 0 END
         )::int AS with_images
       FROM ${TABLE}`
    );
    const row = result.rows[0] ?? { total: '0', with_images: '0' };
    return {
      total: Number(row.total),
      with_images: Number(row.with_images),
    };
  }
}
