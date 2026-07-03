import Knex from 'knex';

import { UnsupportedNotionBlockRepository } from './UnsupportedNotionBlockRepository';

const knex = Knex({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
});

beforeAll(async () => {
  await knex.schema.createTable('unsupported_notion_blocks', (table) => {
    table.text('block_type').primary();
    table.bigInteger('occurrences').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
});

afterAll(() => knex.destroy());

afterEach(() => knex('unsupported_notion_blocks').del());

describe('UnsupportedNotionBlockRepository', () => {
  const repo = new UnsupportedNotionBlockRepository(knex);

  it('records one row per distinct type with per-occurrence counts', async () => {
    await repo.record(['html', 'html', 'unsupported_widget']);

    const rows = await repo.list();
    expect(rows).toEqual([
      expect.objectContaining({ block_type: 'html', occurrences: 2 }),
      expect.objectContaining({
        block_type: 'unsupported_widget',
        occurrences: 1,
      }),
    ]);
  });

  it('increments occurrences on repeat records without duplicating the row', async () => {
    await repo.record(['html']);
    await repo.record(['html', 'html']);

    const rows = await repo.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ block_type: 'html', occurrences: 3 });
  });

  it('orders the listing by occurrences descending', async () => {
    await repo.record(['embed_x', 'html', 'html', 'html', 'file_y', 'file_y']);

    const rows = await repo.list();
    expect(rows.map((r) => r.block_type)).toEqual([
      'html',
      'file_y',
      'embed_x',
    ]);
  });

  it('does nothing when given an empty list', async () => {
    await repo.record([]);
    expect(await repo.list()).toEqual([]);
  });

  it('keeps first_seen at or before last_seen', async () => {
    await repo.record(['html']);
    const [row] = await repo.list();
    expect(new Date(row.first_seen).getTime()).toBeLessThanOrEqual(
      new Date(row.last_seen).getTime()
    );
  });
});
