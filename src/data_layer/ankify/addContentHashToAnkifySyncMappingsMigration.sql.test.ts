import knex, { Knex } from 'knex';

const migration = require('../../../migrations/20260914000000_add_content_hash_to_ankify_sync_mappings.js');

describe('20260914000000 add content_hash to ankify_sync_mappings DDL shape', () => {
  let db: ReturnType<typeof knex>;
  let capturedSql: string[];

  beforeAll(() => {
    db = knex({ client: 'pg' });
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    capturedSql = [];
  });

  const recordingKnex = () => ({
    schema: {
      alterTable: (
        table: string,
        builder: (t: Knex.CreateTableBuilder) => void
      ) => {
        const compiled = db.schema.alterTable(table, builder).toSQL();
        for (const statement of compiled) {
          capturedSql.push(statement.sql);
        }
        return Promise.resolve();
      },
    },
  });

  it('adds a nullable content_hash text column without a default', async () => {
    await migration.up(recordingKnex());

    const joined = capturedSql.join('\n');
    expect(joined).toContain('alter table "ankify_sync_mappings"');
    expect(joined).toContain('add column "content_hash" text');
    expect(joined).not.toMatch(/not null/i);
    expect(joined).not.toMatch(/default/i);
  });

  it('drops the content_hash column on rollback', async () => {
    await migration.down(recordingKnex());

    const joined = capturedSql.join('\n');
    expect(joined).toContain('drop column "content_hash"');
  });
});
