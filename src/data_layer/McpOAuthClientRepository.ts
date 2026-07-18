import type { Knex } from 'knex';
import type McpOauthClients from './public/McpOauthClients';

export interface StoredMcpClient {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string | null;
  token_endpoint_auth_method: string;
  metadata: Record<string, unknown>;
  client_id_issued_at: number;
}

export interface IMcpOAuthClientRepository {
  create(client: StoredMcpClient): Promise<StoredMcpClient>;
  findById(clientId: string): Promise<StoredMcpClient | null>;
}

function toStored(row: McpOauthClients): StoredMcpClient {
  return {
    client_id: row.client_id,
    client_name: row.client_name,
    redirect_uris: row.redirect_uris as string[],
    grant_types: row.grant_types as string[],
    response_types: row.response_types as string[],
    scope: row.scope,
    token_endpoint_auth_method: row.token_endpoint_auth_method,
    metadata: row.metadata as Record<string, unknown>,
    client_id_issued_at: Number(row.client_id_issued_at),
  };
}

export class McpOAuthClientRepository implements IMcpOAuthClientRepository {
  private readonly table = 'mcp_oauth_clients';

  constructor(private readonly database: Knex) {}

  async create(client: StoredMcpClient): Promise<StoredMcpClient> {
    const [row] = await this.database(this.table)
      .insert({
        client_id: client.client_id,
        client_name: client.client_name,
        redirect_uris: JSON.stringify(client.redirect_uris),
        grant_types: JSON.stringify(client.grant_types),
        response_types: JSON.stringify(client.response_types),
        scope: client.scope,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        metadata: JSON.stringify(client.metadata),
        client_id_issued_at: client.client_id_issued_at,
      })
      .returning('*');
    return toStored(row as McpOauthClients);
  }

  async findById(clientId: string): Promise<StoredMcpClient | null> {
    const row = (await this.database(this.table)
      .where({ client_id: clientId })
      .first()) as McpOauthClients | undefined;
    return row == null ? null : toStored(row);
  }
}
