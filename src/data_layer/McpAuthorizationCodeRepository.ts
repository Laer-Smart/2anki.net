import type { Knex } from 'knex';
import type McpAuthorizationCodes from './public/McpAuthorizationCodes';

export interface CreateAuthorizationCodeInput {
  code_hash: string;
  client_id: string;
  user_id: number;
  redirect_uri: string;
  code_challenge: string;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
}

export interface StoredAuthorizationCode {
  id: number;
  client_id: string;
  user_id: number;
  redirect_uri: string;
  code_challenge: string;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface IMcpAuthorizationCodeRepository {
  create(input: CreateAuthorizationCodeInput): Promise<void>;
  findByHash(codeHash: string): Promise<StoredAuthorizationCode | null>;
  consume(id: number, now: Date): Promise<boolean>;
}

function toStored(row: McpAuthorizationCodes): StoredAuthorizationCode {
  return {
    id: row.id,
    client_id: row.client_id,
    user_id: row.user_id,
    redirect_uri: row.redirect_uri,
    code_challenge: row.code_challenge,
    scopes: row.scopes as string[],
    resource: row.resource,
    expires_at: row.expires_at,
    consumed_at: row.consumed_at,
  };
}

export class McpAuthorizationCodeRepository implements IMcpAuthorizationCodeRepository {
  private readonly table = 'mcp_authorization_codes';

  constructor(private readonly database: Knex) {}

  async create(input: CreateAuthorizationCodeInput): Promise<void> {
    await this.database(this.table).insert({
      code_hash: input.code_hash,
      client_id: input.client_id,
      user_id: input.user_id,
      redirect_uri: input.redirect_uri,
      code_challenge: input.code_challenge,
      scopes: JSON.stringify(input.scopes),
      resource: input.resource,
      expires_at: input.expires_at,
    });
  }

  async findByHash(codeHash: string): Promise<StoredAuthorizationCode | null> {
    const row = (await this.database(this.table)
      .where({ code_hash: codeHash })
      .first()) as McpAuthorizationCodes | undefined;
    return row == null ? null : toStored(row);
  }

  async consume(id: number, now: Date): Promise<boolean> {
    const updated = await this.database(this.table)
      .where({ id })
      .whereNull('consumed_at')
      .update({ consumed_at: now });
    return updated === 1;
  }
}
