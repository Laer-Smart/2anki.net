import knex from 'knex';

import { ParsePathSignatureRepository } from './ParsePathSignatureRepository';

describe('ParsePathSignatureRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new ParsePathSignatureRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('upserts with a per-path occurrence increment against excluded', () => {
    const { sql } = repository
      .buildRecordQuery([
        { parse_path: 'recognized', occurrences: 2 },
        { parse_path: 'unclassified', occurrences: 1 },
      ])
      .toSQL();

    expect(sql).toBe(
      'insert into "parse_path_signatures" ("occurrences", "parse_path") ' +
        'values (?, ?), (?, ?) ' +
        'on conflict ("parse_path") ' +
        'do update set "occurrences" = "parse_path_signatures"."occurrences" + excluded.occurrences,' +
        '"last_seen" = CURRENT_TIMESTAMP'
    );
  });

  it('binds the parse paths and their occurrence counts in row order', () => {
    const { bindings } = repository
      .buildRecordQuery([
        { parse_path: 'recognized', occurrences: 2 },
        { parse_path: 'unclassified', occurrences: 1 },
      ])
      .toSQL();

    expect(bindings).toEqual([2, 'recognized', 1, 'unclassified']);
  });
});
