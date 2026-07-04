import Knex from 'knex';

import { ConversionOutputStatsRepository } from './ConversionOutputStatsRepository';

const knex = Knex({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
});

beforeAll(async () => {
  await knex.schema.createTable('conversion_output_stats', (table) => {
    table.text('source').primary();
    table.bigInteger('decks').notNullable().defaultTo(0);
    table.bigInteger('cards').notNullable().defaultTo(0);
    table.bigInteger('empty_back_cards').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
});

afterAll(() => knex.destroy());

afterEach(() => knex('conversion_output_stats').del());

describe('ConversionOutputStatsRepository', () => {
  const repo = new ConversionOutputStatsRepository(knex);

  it('records the counters for a source', async () => {
    await repo.record('upload', { decks: 1, cards: 12, emptyBack: 3 });

    const rows = await repo.list();
    expect(rows).toEqual([
      expect.objectContaining({
        source: 'upload',
        decks: 1,
        cards: 12,
        empty_back_cards: 3,
      }),
    ]);
  });

  it('accumulates counters on repeat records without duplicating the row', async () => {
    await repo.record('upload', { decks: 1, cards: 10, emptyBack: 2 });
    await repo.record('upload', { decks: 2, cards: 5, emptyBack: 1 });

    const rows = await repo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'upload',
      decks: 3,
      cards: 15,
      empty_back_cards: 3,
    });
  });

  it('keeps sources separate and orders by cards descending', async () => {
    await repo.record('upload', { decks: 1, cards: 5, emptyBack: 0 });
    await repo.record('convert', { decks: 1, cards: 30, emptyBack: 4 });

    const rows = await repo.list();
    expect(rows.map((r) => r.source)).toEqual(['convert', 'upload']);
  });

  it('records a zero-empty-back conversion', async () => {
    await repo.record('convert', { decks: 1, cards: 8, emptyBack: 0 });

    const rows = await repo.list();
    expect(rows[0]).toMatchObject({ source: 'convert', empty_back_cards: 0 });
  });
});
