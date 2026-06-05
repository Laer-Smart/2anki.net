import { Knex } from 'knex';

import {
  AnkifySessionToken,
  NewAnkifySessionToken,
} from '../../entities/ankify';

const TABLE = 'ankify_session_tokens';

export interface AnkifySessionTokensRepositoryInterface {
  insert(input: NewAnkifySessionToken): Promise<AnkifySessionToken>;
  findActiveByHash(tokenHash: string): Promise<AnkifySessionToken | null>;
  findActiveByClientId(
    ankifyClientId: number
  ): Promise<AnkifySessionToken | null>;
  touchLastUsed(id: number): Promise<void>;
  revokeByClientId(ankifyClientId: number): Promise<void>;
}

export class AnkifySessionTokensRepository implements AnkifySessionTokensRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async insert(input: NewAnkifySessionToken): Promise<AnkifySessionToken> {
    const [row] = await this.database<AnkifySessionToken>(TABLE)
      .insert({
        ankify_client_id: input.ankify_client_id,
        owner: input.owner,
        token_hash: input.token_hash,
        expires_at: input.expires_at,
      })
      .returning('*');
    return row;
  }

  async findActiveByHash(
    tokenHash: string
  ): Promise<AnkifySessionToken | null> {
    const row = await this.database<AnkifySessionToken>(TABLE)
      .select('*')
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', this.database.fn.now())
      .first();
    return row ?? null;
  }

  async findActiveByClientId(
    ankifyClientId: number
  ): Promise<AnkifySessionToken | null> {
    const row = await this.database<AnkifySessionToken>(TABLE)
      .select('*')
      .where({ ankify_client_id: ankifyClientId })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', this.database.fn.now())
      .first();
    return row ?? null;
  }

  async touchLastUsed(id: number): Promise<void> {
    await this.database(TABLE)
      .update({ last_used_at: this.database.fn.now() })
      .where({ id });
  }

  async revokeByClientId(ankifyClientId: number): Promise<void> {
    await this.database(TABLE)
      .update({ revoked_at: this.database.fn.now() })
      .where({ ankify_client_id: ankifyClientId })
      .whereNull('revoked_at');
  }
}
