import type { Knex } from 'knex';
import type ApiKeys from './public/ApiKeys';

export interface CreateApiKeyInput {
  user_id: number;
  name: string;
  key_hash: string;
  prefix: string;
}

export interface ApiKeyListItem {
  id: number;
  name: string;
  prefix: string;
  last_used_at: Date | null;
  created_at: Date;
}

export interface ActiveApiKey {
  id: number;
  user_id: number;
}

export interface IApiKeyRepository {
  create(input: CreateApiKeyInput): Promise<ApiKeyListItem>;
  findActiveByHash(keyHash: string): Promise<ActiveApiKey | null>;
  listByUser(userId: number): Promise<ApiKeyListItem[]>;
  revoke(id: number, userId: number): Promise<boolean>;
  touchLastUsed(id: number, now: Date): Promise<void>;
}

function toListItem(row: ApiKeys): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
  };
}

export class ApiKeyRepository implements IApiKeyRepository {
  private readonly table = 'api_keys';

  constructor(private readonly database: Knex) {}

  async create(input: CreateApiKeyInput): Promise<ApiKeyListItem> {
    const [row] = await this.database(this.table)
      .insert({
        user_id: input.user_id,
        name: input.name,
        key_hash: input.key_hash,
        prefix: input.prefix,
      })
      .returning('*');
    return toListItem(row as ApiKeys);
  }

  async findActiveByHash(keyHash: string): Promise<ActiveApiKey | null> {
    const row = (await this.database(this.table)
      .where({ key_hash: keyHash })
      .whereNull('revoked_at')
      .first()) as ApiKeys | undefined;
    if (row == null) {
      return null;
    }
    return { id: row.id, user_id: row.user_id };
  }

  async listByUser(userId: number): Promise<ApiKeyListItem[]> {
    const rows = (await this.database(this.table)
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .orderBy('created_at', 'desc')) as ApiKeys[];
    return rows.map(toListItem);
  }

  async revoke(id: number, userId: number): Promise<boolean> {
    const affected = await this.database(this.table)
      .where({ id, user_id: userId })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
    return affected > 0;
  }

  async touchLastUsed(id: number, now: Date): Promise<void> {
    await this.database(this.table).where({ id }).update({ last_used_at: now });
  }
}

export default ApiKeyRepository;
