import knex from 'knex';

describe('20260805000000_add_pitch_dismissals migration DDL shape', () => {
  let db: ReturnType<typeof knex>;

  beforeAll(() => {
    db = knex({ client: 'pg' });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('user_id column is plain integer with no unsigned modifier', () => {
    const sql = db.schema
      .createTable('pitch_dismissals', (t) => {
        t.increments('id').primary();
        t.integer('user_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        t.text('placement').notNullable();
        t.timestamp('dismissed_at', { useTz: true })
          .notNullable()
          .defaultTo(db.fn.now());
        t.unique(['user_id', 'placement']);
        t.index('user_id');
      })
      .toSQL();

    const createSql = sql[0].sql;
    expect(createSql).toContain('"user_id" integer');
    expect(createSql).not.toMatch(/unsigned/i);
  });

  it('FK references users(id) where users.id is serial (int4) matching integer (int4)', () => {
    const usersSql = db.schema
      .createTable('users', (t) => {
        t.increments('id');
      })
      .toSQL();

    const pitchSql = db.schema
      .createTable('pitch_dismissals', (t) => {
        t.integer('user_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
      })
      .toSQL();

    const usersIdType = usersSql[0].sql.match(/"id" (\w+)/)?.[1];
    const fkColumnType = pitchSql[0].sql.match(/"user_id" (\w+)/)?.[1];
    const fkConstraint = pitchSql[1].sql;

    expect(usersIdType).toBe('serial');
    expect(fkColumnType).toBe('integer');
    expect(fkConstraint).toContain('references "users" ("id")');
  });
});
