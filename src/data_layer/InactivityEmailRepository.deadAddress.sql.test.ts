import knexFactory from 'knex';

import { InactivityEmailRepository } from './InactivityEmailRepository';

describe('InactivityEmailRepository dead-address candidate SQL', () => {
  const pg = knexFactory({ client: 'pg' });
  const repository = new InactivityEmailRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('selects free accounts inactive for the inactivity window without a warning requirement', () => {
    const sql = repository.buildDeadAddressCandidatesQuery(100).toString();

    expect(sql).toContain('select "u"."id", "u"."email" from "users" as "u"');
    expect(sql).toContain("u.last_login_at < now() - interval '6 months'");
    expect(sql).toContain(
      "u.last_login_at IS NULL AND u.created_at < now() - interval '6 months'"
    );
    expect(sql).toContain('u.patreon IS NOT TRUE');
    expect(sql).toContain('"subscriptions"');
    expect(sql).toContain('"subscriptions"."active"');
    expect(sql).toContain('limit 100');
  });

  it('does not gate the candidate query on inactivity_emails', () => {
    const sql = repository.buildDeadAddressCandidatesQuery(100).toString();

    expect(sql).not.toContain('inactivity_emails');
  });
});
