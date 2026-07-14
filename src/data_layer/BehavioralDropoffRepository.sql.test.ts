import knex from 'knex';

import { BehavioralDropoffRepository } from './BehavioralDropoffRepository';

const since = new Date('2026-06-14T00:00:00.000Z');

describe('BehavioralDropoffRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new BehavioralDropoffRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('counts signups in the window that never started an upload', () => {
    const { sql, bindings } = repository
      .buildSignupsWithoutFirstUploadQuery(since)
      .toSQL();

    expect(sql).toBe(
      'select count(*) as "count" from ' +
        '(select distinct "user_id" from "events" where "name" = ? and "created_at" >= ? and "user_id" is not null) as "signups" ' +
        'where not exists ' +
        '(select 1 from "events" as "uploads" where "uploads"."name" = ? and uploads.user_id = signups.user_id)'
    );
    expect(bindings).toEqual(['account_created', since, 'upload_started']);
  });

  it('counts technical conversion failures inside the window, excluding plan-limit blocks', () => {
    const { sql, bindings } = repository
      .buildFailedConversionsQuery(since)
      .toSQL();

    expect(sql).toBe(
      'select count("jobs"."id") as "count" from "jobs" ' +
        'where "jobs"."status" = ? and "jobs"."created_at" >= ? and "jobs"."type" in (?, ?, ?) ' +
        'and (jobs.job_reason_failure IS NULL OR jobs.job_reason_failure NOT LIKE ?)'
    );
    expect(bindings).toEqual([
      'failed',
      since,
      'page',
      'database',
      'conversion',
      '%"code":"monthly_limit"%',
    ]);
  });

  it('counts completed conversions that produced zero cards inside the window', () => {
    const { sql, bindings } = repository
      .buildZeroCardConversionsQuery(since)
      .toSQL();

    expect(sql).toBe(
      'select count("jobs"."id") as "count" from "jobs" ' +
        'where "jobs"."status" = ? and "jobs"."created_at" >= ? and "jobs"."type" in (?, ?, ?) ' +
        'and "jobs"."card_count" = ?'
    );
    expect(bindings).toEqual([
      'done',
      since,
      'page',
      'database',
      'conversion',
      0,
    ]);
  });
});
