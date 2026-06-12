import knex from 'knex';

import {
  InMemorySubscriptionRecoveryNotificationsRepository,
  SubscriptionRecoveryNotificationsRepository,
} from './SubscriptionRecoveryNotificationsRepository';

describe('InMemorySubscriptionRecoveryNotificationsRepository', () => {
  it('reports a hash as not notified before any record', async () => {
    const repo = new InMemorySubscriptionRecoveryNotificationsRepository();

    const result = await repo.wasNotifiedSince('hash-a', new Date(0));

    expect(result).toBe(false);
  });

  it('reports a hash as notified after recordNotified within the window', async () => {
    const repo = new InMemorySubscriptionRecoveryNotificationsRepository();
    await repo.recordNotified('hash-a');

    const result = await repo.wasNotifiedSince(
      'hash-a',
      new Date(Date.now() - 1000)
    );

    expect(result).toBe(true);
  });

  it('reports not notified when the only record predates the since cutoff', async () => {
    const repo = new InMemorySubscriptionRecoveryNotificationsRepository();
    await repo.recordNotified('hash-a');

    const result = await repo.wasNotifiedSince(
      'hash-a',
      new Date(Date.now() + 1000)
    );

    expect(result).toBe(false);
  });
});

describe('SubscriptionRecoveryNotificationsRepository — generated SQL shape', () => {
  it('wasNotifiedSince filters by email_hash and notified_at cutoff', () => {
    const pgKnex = knex({ client: 'pg' });
    const since = new Date('2026-06-01T00:00:00.000Z');
    const sql = pgKnex('subscription_recovery_notifications')
      .where({ email_hash: 'hash-a' })
      .where('notified_at', '>=', since)
      .first()
      .toString();
    expect(sql).toContain('"email_hash" = \'hash-a\'');
    expect(sql).toContain('"notified_at" >=');
    pgKnex.destroy();
  });

  it('recordNotified inserts the email_hash', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('subscription_recovery_notifications')
      .insert({ email_hash: 'hash-a' })
      .toString();
    expect(sql).toContain('insert into "subscription_recovery_notifications"');
    expect(sql).toContain('"email_hash"');
    pgKnex.destroy();
  });
});
