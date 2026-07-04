import Knex from 'knex';

import { ParsePathSignatureRepository } from './ParsePathSignatureRepository';

const knex = Knex({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
});

beforeAll(async () => {
  await knex.schema.createTable('parse_path_signatures', (table) => {
    table.text('parse_path').primary();
    table.bigInteger('occurrences').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
});

afterAll(() => knex.destroy());

afterEach(() => knex('parse_path_signatures').del());

describe('ParsePathSignatureRepository', () => {
  const repo = new ParsePathSignatureRepository(knex);

  it('records one row per distinct parse path with per-occurrence counts', async () => {
    await repo.record(['recognized', 'recognized', 'unclassified']);

    const rows = await repo.list();
    expect(rows).toEqual([
      expect.objectContaining({ parse_path: 'recognized', occurrences: 2 }),
      expect.objectContaining({ parse_path: 'unclassified', occurrences: 1 }),
    ]);
  });

  it('increments occurrences on repeat records without duplicating the row', async () => {
    await repo.record(['unclassified']);
    await repo.record(['unclassified', 'unclassified']);

    const rows = await repo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      parse_path: 'unclassified',
      occurrences: 3,
    });
  });

  it('does nothing when given an empty list', async () => {
    await repo.record([]);
    expect(await repo.list()).toEqual([]);
  });
});
