import knex from 'knex';

import { McpTokenRepository } from './McpTokenRepository';

const now = new Date('2026-07-20T00:00:00.000Z');

describe('McpTokenRepository deletion generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new McpTokenRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('deletes access tokens whose expiry has passed', () => {
    const { sql, bindings } = repository
      .buildDeleteExpiredAccessTokensQuery(now)
      .toSQL();

    expect(sql).toBe('delete from "mcp_access_tokens" where "expires_at" < ?');
    expect(bindings).toEqual([now]);
  });

  it('deletes refresh tokens whose expiry has passed', () => {
    const { sql, bindings } = repository
      .buildDeleteExpiredRefreshTokensQuery(now)
      .toSQL();

    expect(sql).toBe('delete from "mcp_refresh_tokens" where "expires_at" < ?');
    expect(bindings).toEqual([now]);
  });
});
