import knex from 'knex';

import { ConversionOutputStatsRepository } from './ConversionOutputStatsRepository';

describe('ConversionOutputStatsRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new ConversionOutputStatsRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('upserts each counter with an increment against excluded', () => {
    const { sql } = repository
      .buildRecordQuery({
        source: 'upload',
        decks: 1,
        cards: 12,
        empty_back_cards: 3,
      })
      .toSQL();

    expect(sql).toBe(
      'insert into "conversion_output_stats" ("cards", "decks", "empty_back_cards", "source") ' +
        'values (?, ?, ?, ?) ' +
        'on conflict ("source") ' +
        'do update set "decks" = "conversion_output_stats"."decks" + excluded.decks,' +
        '"cards" = "conversion_output_stats"."cards" + excluded.cards,' +
        '"empty_back_cards" = "conversion_output_stats"."empty_back_cards" + excluded.empty_back_cards,' +
        '"last_seen" = CURRENT_TIMESTAMP'
    );
  });

  it('binds the counters in column order', () => {
    const { bindings } = repository
      .buildRecordQuery({
        source: 'upload',
        decks: 1,
        cards: 12,
        empty_back_cards: 3,
      })
      .toSQL();

    expect(bindings).toEqual([12, 1, 3, 'upload']);
  });
});
