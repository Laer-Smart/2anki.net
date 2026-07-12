import knex from 'knex';

import { buildLandingPageYieldQuery } from './LandingPageYieldRepository';

describe('buildLandingPageYieldQuery', () => {
  const pg = knex({ client: 'pg' });
  const since = new Date('2026-06-01T00:00:00.000Z');

  it('groups signups by origin filtered on created_at', () => {
    const sql = buildLandingPageYieldQuery(pg, since).toString();

    expect(sql).toContain('from "users"');
    expect(sql).toContain('users.signup_origin as origin');
    expect(sql).toContain('count(*) as signups');
    expect(sql).toContain('"users"."created_at" >=');
    expect(sql).toContain('group by "users"."signup_origin"');
    expect(sql).toContain('order by "signups" desc');
  });

  it('counts active subscriptions via the email and linked_email match', () => {
    const sql = buildLandingPageYieldQuery(pg, since).toString();

    expect(sql).toContain('count(*) filter (where');
    expect(sql).toContain('from subscriptions s');
    expect(sql).toContain('s.active = true');
    expect(sql).toContain('lower(trim(users.email)) = lower(trim(s.email))');
    expect(sql).toContain('lower(trim(users.email)) = s.linked_email');
    expect(sql).toContain('as subscription_conversions');
  });

  it('counts purchased passes via the user_passes user_id link', () => {
    const sql = buildLandingPageYieldQuery(pg, since).toString();

    expect(sql).toContain('from user_passes up where up.user_id = users.id');
    expect(sql).toContain('as pass_conversions');
  });

  it('counts deduplicated paid users as sub or pass in one filter', () => {
    const sql = buildLandingPageYieldQuery(pg, since).toString();

    const paidFilter = sql.slice(sql.indexOf('as paid_conversions') - 400);
    expect(sql).toContain('as paid_conversions');
    expect(paidFilter).toContain('from subscriptions s');
    expect(paidFilter).toContain('from user_passes up');
    expect(paidFilter).toContain(') or exists (');
  });
});
