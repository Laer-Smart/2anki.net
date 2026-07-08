import knex from 'knex';
import UserPassRepository from './UserPassRepository';

describe('UserPassRepository.countPaidPassesSince SQL shape', () => {
  const db = knex({ client: 'pg' });

  afterAll(async () => {
    await db.destroy();
  });

  it('counts only 24h and 7d passes for the user newer than the cutoff', () => {
    const repo = new UserPassRepository(db);
    const since = new Date('2026-06-03T00:00:00Z');
    const sql = repo.countPaidPassesQuery(21, since).toString();

    expect(sql).toContain('"user_passes"');
    expect(sql).toContain('"user_id" = 21');
    expect(sql).toContain("\"kind\" in ('24h', '7d')");
    expect(sql).toContain('"expires_at" >');
    expect(sql).toContain('group by "kind"');
    expect(sql).toContain('count(*)');
  });
});
