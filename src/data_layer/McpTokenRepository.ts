import type { Knex } from 'knex';
import type McpAccessTokens from './public/McpAccessTokens';
import type McpRefreshTokens from './public/McpRefreshTokens';

export interface CreateTokenInput {
  token_hash: string;
  client_id: string;
  user_id: number;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
}

export interface StoredToken {
  id: number;
  client_id: string;
  user_id: number;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface IMcpTokenRepository {
  createAccessToken(input: CreateTokenInput): Promise<void>;
  createRefreshToken(input: CreateTokenInput): Promise<void>;
  findAccessTokenByHash(tokenHash: string): Promise<StoredToken | null>;
  findRefreshTokenByHash(tokenHash: string): Promise<StoredToken | null>;
  revokeAccessTokenByHash(tokenHash: string): Promise<void>;
  revokeRefreshTokenByHash(tokenHash: string): Promise<void>;
  revokeAllForUserClient(userId: number, clientId: string): Promise<void>;
}

function toStored(row: McpAccessTokens | McpRefreshTokens): StoredToken {
  return {
    id: row.id,
    client_id: row.client_id,
    user_id: row.user_id,
    scopes: row.scopes as string[],
    resource: row.resource,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
  };
}

export class McpTokenRepository implements IMcpTokenRepository {
  private readonly accessTable = 'mcp_access_tokens';
  private readonly refreshTable = 'mcp_refresh_tokens';

  constructor(private readonly database: Knex) {}

  private insertRow(table: string, input: CreateTokenInput) {
    return this.database(table).insert({
      token_hash: input.token_hash,
      client_id: input.client_id,
      user_id: input.user_id,
      scopes: JSON.stringify(input.scopes),
      resource: input.resource,
      expires_at: input.expires_at,
    });
  }

  async createAccessToken(input: CreateTokenInput): Promise<void> {
    await this.insertRow(this.accessTable, input);
  }

  async createRefreshToken(input: CreateTokenInput): Promise<void> {
    await this.insertRow(this.refreshTable, input);
  }

  async findAccessTokenByHash(tokenHash: string): Promise<StoredToken | null> {
    const row = (await this.database(this.accessTable)
      .where({ token_hash: tokenHash })
      .first()) as McpAccessTokens | undefined;
    return row == null ? null : toStored(row);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<StoredToken | null> {
    const row = (await this.database(this.refreshTable)
      .where({ token_hash: tokenHash })
      .first()) as McpRefreshTokens | undefined;
    return row == null ? null : toStored(row);
  }

  async revokeAccessTokenByHash(tokenHash: string): Promise<void> {
    await this.database(this.accessTable)
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.database(this.refreshTable)
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
  }

  async revokeAllForUserClient(
    userId: number,
    clientId: string
  ): Promise<void> {
    const now = new Date();
    await this.database(this.accessTable)
      .where({ user_id: userId, client_id: clientId })
      .whereNull('revoked_at')
      .update({ revoked_at: now });
    await this.database(this.refreshTable)
      .where({ user_id: userId, client_id: clientId })
      .whereNull('revoked_at')
      .update({ revoked_at: now });
  }
}
