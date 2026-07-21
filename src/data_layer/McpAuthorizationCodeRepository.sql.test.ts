import knex from 'knex';

import { McpAuthorizationCodeRepository } from './McpAuthorizationCodeRepository';

const now = new Date('2026-07-20T00:00:00.000Z');

describe('McpAuthorizationCodeRepository deleteExpired generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new McpAuthorizationCodeRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('deletes authorization codes whose expiry has passed', () => {
    const { sql, bindings } = repository.buildDeleteExpiredQuery(now).toSQL();

    expect(sql).toBe(
      'delete from "mcp_authorization_codes" where "expires_at" < ?'
    );
    expect(bindings).toEqual([now]);
  });
});
