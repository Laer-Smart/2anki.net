import knex from 'knex';

import { buildOrphanedSubscriptionsQuery } from './OrphanedSubscriptionsRepository';

describe('OrphanedSubscriptionsRepository — generated SQL shape', () => {
  it('selects active subs with no matching user by email, linked_email, or customer id', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = buildOrphanedSubscriptionsQuery(pgKnex).toString();

    expect(sql).toContain('from "subscriptions"');
    expect(sql).toContain('where "subscriptions"."active" = true');
    expect(sql).toContain('not exists');

    expect(sql).toContain(
      'lower(trim(users.email)) = lower(trim(subscriptions.email))'
    );
    expect(sql).toContain('subscriptions.linked_email');
    expect(sql).toContain(
      "users.stripe_customer_id = subscriptions.payload->>'customer'"
    );

    pgKnex.destroy();
  });

  it('selects the id, email, stripe_product_id, created_at, and payload customer id', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = buildOrphanedSubscriptionsQuery(pgKnex).toString();

    expect(sql).toContain('"subscriptions"."id"');
    expect(sql).toContain('"subscriptions"."email"');
    expect(sql).toContain('"subscriptions"."stripe_product_id"');
    expect(sql).toContain('"subscriptions"."created_at"');
    expect(sql).toContain("subscriptions.payload->>'customer' as customer_id");

    pgKnex.destroy();
  });
});
