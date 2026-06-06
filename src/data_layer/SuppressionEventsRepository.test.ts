import knexFactory from 'knex';

import {
  DuplicateSuppressionEventError,
  InMemorySuppressionEventsRepository,
  SuppressionEventsRepository,
} from './SuppressionEventsRepository';

describe('InMemorySuppressionEventsRepository', () => {
  const emailHash = 'a'.repeat(64);

  it('records an event and reports the address suppressed after a bounce', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    await repo.record({
      emailHash,
      eventType: 'bounce',
      sgEventId: 'evt-1',
      eventAt: new Date('2026-06-06T10:00:00.000Z'),
    });

    expect(await repo.isSuppressed(emailHash)).toBe(true);
  });

  it.each(['bounce', 'dropped', 'spamreport', 'blocked'] as const)(
    'treats %s as a hard suppression',
    async (eventType) => {
      const repo = new InMemorySuppressionEventsRepository();
      await repo.record({
        emailHash,
        eventType,
        sgEventId: `evt-${eventType}`,
        eventAt: new Date('2026-06-06T10:00:00.000Z'),
      });

      expect(await repo.isSuppressed(emailHash)).toBe(true);
    }
  );

  it('does not suppress on a deferred event', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    await repo.record({
      emailHash,
      eventType: 'deferred',
      sgEventId: 'evt-deferred',
      eventAt: new Date('2026-06-06T10:00:00.000Z'),
    });

    expect(await repo.isSuppressed(emailHash)).toBe(false);
  });

  it('clears suppression when a later delivered event arrives', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    await repo.record({
      emailHash,
      eventType: 'bounce',
      sgEventId: 'evt-bounce',
      eventAt: new Date('2026-06-06T10:00:00.000Z'),
    });
    await repo.record({
      emailHash,
      eventType: 'delivered',
      sgEventId: 'evt-delivered',
      eventAt: new Date('2026-06-06T11:00:00.000Z'),
    });

    expect(await repo.isSuppressed(emailHash)).toBe(false);
  });

  it('keeps suppression when the bounce is newer than the delivered', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    await repo.record({
      emailHash,
      eventType: 'delivered',
      sgEventId: 'evt-delivered',
      eventAt: new Date('2026-06-06T10:00:00.000Z'),
    });
    await repo.record({
      emailHash,
      eventType: 'bounce',
      sgEventId: 'evt-bounce',
      eventAt: new Date('2026-06-06T11:00:00.000Z'),
    });

    expect(await repo.isSuppressed(emailHash)).toBe(true);
  });

  it('rejects a duplicate SendGrid event id', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    await repo.record({
      emailHash,
      eventType: 'bounce',
      sgEventId: 'evt-dup',
      eventAt: new Date('2026-06-06T10:00:00.000Z'),
    });

    await expect(
      repo.record({
        emailHash,
        eventType: 'bounce',
        sgEventId: 'evt-dup',
        eventAt: new Date('2026-06-06T10:00:00.000Z'),
      })
    ).rejects.toBeInstanceOf(DuplicateSuppressionEventError);
  });

  it('reports an unknown address as not suppressed', async () => {
    const repo = new InMemorySuppressionEventsRepository();
    expect(await repo.isSuppressed('f'.repeat(64))).toBe(false);
  });
});

describe('SuppressionEventsRepository SQL shape', () => {
  const pg = knexFactory({ client: 'pg' });
  const emailHash = 'b'.repeat(64);

  afterAll(async () => {
    await pg.destroy();
  });

  it('builds an isSuppressed query scoped to the email hash ordered by recency', () => {
    const sql = pg('suppression_events')
      .where('email_hash', emailHash)
      .orderBy('event_at', 'desc')
      .limit(1)
      .select('event_type')
      .toString();

    expect(sql).toContain('"suppression_events"');
    expect(sql).toContain('"email_hash" =');
    expect(sql).toContain('order by "event_at" desc');
    expect(sql).toContain('limit 1');
  });
});
