import knex from 'knex';

import { McpOAuthClientRepository } from './McpOAuthClientRepository';

describe('McpOAuthClientRepository deleteOrphaned generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new McpOAuthClientRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('deletes clients issued before the cutoff with no codes or tokens', () => {
    const issuedBefore = 1_700_000_000;
    const { sql, bindings } = repository
      .buildDeleteOrphanedQuery(issuedBefore)
      .toSQL();

    expect(sql).toBe(
      'delete from "mcp_oauth_clients" where "client_id_issued_at" < ? ' +
        'and not exists ' +
        '(select 1 from "mcp_authorization_codes" ' +
        'where mcp_authorization_codes.client_id = mcp_oauth_clients.client_id) ' +
        'and not exists ' +
        '(select 1 from "mcp_access_tokens" ' +
        'where mcp_access_tokens.client_id = mcp_oauth_clients.client_id) ' +
        'and not exists ' +
        '(select 1 from "mcp_refresh_tokens" ' +
        'where mcp_refresh_tokens.client_id = mcp_oauth_clients.client_id)'
    );
    expect(bindings).toEqual([issuedBefore]);
  });
});
