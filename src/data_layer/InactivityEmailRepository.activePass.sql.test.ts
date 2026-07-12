import knexFactory from 'knex';

import { InactivityEmailRepository } from './InactivityEmailRepository';

describe('InactivityEmailRepository active-pass exemption SQL', () => {
  const pg = knexFactory({ client: 'pg' });
  const repository = new InactivityEmailRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('exempts active user_passes holders from the warning query', () => {
    const sql = repository.buildUsersToNotifyQuery(500).toString();

    expect(sql).toContain('"user_passes"');
    expect(sql).toContain('user_passes.user_id = users.id');
    expect(sql).toContain('user_passes.expires_at > now()');
  });

  it('exempts active user_passes holders from the deletion query', () => {
    const sql = repository.buildUsersToDeleteQuery(100).toString();

    expect(sql).toContain('"user_passes"');
    expect(sql).toContain('user_passes.user_id = u.id');
    expect(sql).toContain('user_passes.expires_at > now()');
  });

  it('exempts active user_passes holders from the dead-address candidate query', () => {
    const sql = repository.buildDeadAddressCandidatesQuery(100).toString();

    expect(sql).toContain('"user_passes"');
    expect(sql).toContain('user_passes.user_id = u.id');
    expect(sql).toContain('user_passes.expires_at > now()');
  });
});
