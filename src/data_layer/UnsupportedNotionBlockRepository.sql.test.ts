import knex from 'knex';

import { UnsupportedNotionBlockRepository } from './UnsupportedNotionBlockRepository';

describe('UnsupportedNotionBlockRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new UnsupportedNotionBlockRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('upserts with a per-type occurrence increment against excluded', () => {
    const { sql } = repository
      .buildRecordQuery([
        { block_type: 'html', occurrences: 2 },
        { block_type: 'unsupported_widget', occurrences: 1 },
      ])
      .toSQL();

    expect(sql).toBe(
      'insert into "unsupported_notion_blocks" ("block_type", "occurrences") ' +
        'values (?, ?), (?, ?) ' +
        'on conflict ("block_type") ' +
        'do update set "occurrences" = "unsupported_notion_blocks"."occurrences" + excluded.occurrences,' +
        '"last_seen" = CURRENT_TIMESTAMP'
    );
  });

  it('binds the block types and their occurrence counts in row order', () => {
    const { bindings } = repository
      .buildRecordQuery([
        { block_type: 'html', occurrences: 2 },
        { block_type: 'unsupported_widget', occurrences: 1 },
      ])
      .toSQL();

    expect(bindings).toEqual(['html', 2, 'unsupported_widget', 1]);
  });
});
