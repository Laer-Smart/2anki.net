import knex, { Knex } from 'knex';

const migration = require('../../migrations/20260920000000_add_language_to_users.js');

describe('20260920000000 add language to users DDL shape', () => {
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

  it('adds a nullable varchar language column without a default', async () => {
    await migration.up(recordingKnex());

    const joined = capturedSql.join('\n');
    expect(joined).toContain('alter table "users"');
    expect(joined).toContain('add column "language" varchar(8)');
    expect(joined).not.toMatch(/not null/i);
    expect(joined).not.toMatch(/default/i);
  });

  it('drops the language column on rollback', async () => {
    await migration.down(recordingKnex());

    const joined = capturedSql.join('\n');
    expect(joined).toContain('drop column "language"');
  });
});
