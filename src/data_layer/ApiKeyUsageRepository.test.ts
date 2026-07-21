import knex from 'knex';
import { ApiKeyUsageRepository } from './ApiKeyUsageRepository';

describe('ApiKeyUsageRepository SQL generation', () => {
  const db = knex({ client: 'pg' });

  it('incrementCards upserts with an additive merge on conflict', () => {
    const qb = db('api_key_usage')
      .insert({ user_id: 7, month: '2026-07-01', cards: 12 })
      .onConflict(['user_id', 'month'])
      .merge({ cards: db.raw('api_key_usage.cards + ?', [12]) })
      .returning('cards');
    const sql = qb.toString();
    expect(sql).toContain('insert into "api_key_usage"');
    expect(sql).toContain('on conflict ("user_id", "month")');
    expect(sql).toContain('"cards" = api_key_usage.cards + 12');
    expect(sql).toContain('returning "cards"');
  });

  it('normalizes any date inside a month to the first of that month (UTC)', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const fake = {
      insert(row: Record<string, unknown>) {
        captured.push(row);
        return {
          onConflict: () => ({
            merge: () => ({ returning: async () => [{ cards: row.cards }] }),
          }),
        };
      },
    };
    const database = Object.assign(() => fake, {
      raw: () => 'raw',
    }) as unknown as knex.Knex;
    const repo = new ApiKeyUsageRepository(database);

    await repo.incrementCards(7, new Date('2026-07-21T23:59:00Z'), 3);

    expect(captured[0].month).toBe('2026-07-01');
  });
});
