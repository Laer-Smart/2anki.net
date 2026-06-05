import { Knex } from 'knex';

import {
  AnkifyNotionSubscription,
  UpsertAnkifyNotionSubscription,
} from '../../entities/ankify';

const TABLE = 'ankify_notion_subscriptions';

export interface AnkifyNotionSubscriptionsRepositoryInterface {
  upsert(
    input: UpsertAnkifyNotionSubscription
  ): Promise<AnkifyNotionSubscription>;
  listByOwner(owner: number): Promise<AnkifyNotionSubscription[]>;
  listEnabled(): Promise<AnkifyNotionSubscription[]>;
  findByPageId(notionPageId: string): Promise<AnkifyNotionSubscription[]>;
  findById(id: number, owner: number): Promise<AnkifyNotionSubscription | null>;
  setEnabled(id: number, enabled: boolean): Promise<void>;
  deleteById(id: number, owner: number): Promise<void>;
  recordPoll(
    id: number,
    options: { synced?: boolean; error?: string | null }
  ): Promise<void>;
}

export class AnkifyNotionSubscriptionsRepository implements AnkifyNotionSubscriptionsRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async upsert(
    input: UpsertAnkifyNotionSubscription
  ): Promise<AnkifyNotionSubscription> {
    const insertPayload: Record<string, unknown> = {
      owner: input.owner,
      ankify_client_id: input.ankify_client_id,
      notion_page_id: input.notion_page_id,
      enabled: input.enabled,
      updated_at: this.database.fn.now(),
    };
    const mergePayload: Record<string, unknown> = {
      ankify_client_id: input.ankify_client_id,
      enabled: input.enabled,
      updated_at: this.database.fn.now(),
    };
    if (input.notion_page_title !== undefined) {
      insertPayload.notion_page_title = input.notion_page_title;
      mergePayload.notion_page_title = input.notion_page_title;
    }
    if (input.notion_page_url !== undefined) {
      insertPayload.notion_page_url = input.notion_page_url;
      mergePayload.notion_page_url = input.notion_page_url;
    }
    if (input.notion_page_icon !== undefined) {
      insertPayload.notion_page_icon = input.notion_page_icon;
      mergePayload.notion_page_icon = input.notion_page_icon;
    }
    const [row] = await this.database<AnkifyNotionSubscription>(TABLE)
      .insert(insertPayload)
      .onConflict(['owner', 'notion_page_id'])
      .merge(mergePayload)
      .returning('*');
    return row;
  }

  listByOwner(owner: number): Promise<AnkifyNotionSubscription[]> {
    return this.database<AnkifyNotionSubscription>(TABLE)
      .select('*')
      .where({ owner })
      .orderBy('created_at', 'desc');
  }

  listEnabled(): Promise<AnkifyNotionSubscription[]> {
    return this.database<AnkifyNotionSubscription>(TABLE)
      .select('*')
      .where({ enabled: true });
  }

  findByPageId(notionPageId: string): Promise<AnkifyNotionSubscription[]> {
    return this.database<AnkifyNotionSubscription>(TABLE)
      .select('*')
      .where({ notion_page_id: notionPageId, enabled: true });
  }

  async findById(
    id: number,
    owner: number
  ): Promise<AnkifyNotionSubscription | null> {
    const row = await this.database<AnkifyNotionSubscription>(TABLE)
      .select('*')
      .where({ id, owner })
      .first();
    return row ?? null;
  }

  async setEnabled(id: number, enabled: boolean): Promise<void> {
    await this.database(TABLE)
      .update({
        enabled,
        updated_at: this.database.fn.now() as unknown as Date,
      })
      .where({ id });
  }

  async deleteById(id: number, owner: number): Promise<void> {
    await this.database(TABLE).delete().where({ id, owner });
  }

  async recordPoll(
    id: number,
    options: { synced?: boolean; error?: string | null }
  ): Promise<void> {
    const update: Record<string, unknown> = {
      last_polled_at: this.database.fn.now(),
      updated_at: this.database.fn.now(),
      last_error: options.error ?? null,
    };
    if (options.synced) {
      update.last_synced_at = this.database.fn.now();
    }
    await this.database(TABLE).update(update).where({ id });
  }
}
