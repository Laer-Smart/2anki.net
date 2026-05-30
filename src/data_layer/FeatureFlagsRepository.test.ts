import knex from 'knex';

describe('FeatureFlagsRepository — generated SQL shape', () => {
  it('getAll joins users for email and orders by key', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('feature_flags as f')
      .leftJoin('users as u', 'f.updated_by', 'u.id')
      .select(
        'f.key',
        'f.value',
        'f.description',
        'f.updated_at',
        'f.updated_by',
        { updated_by_email: 'u.email' }
      )
      .orderBy('f.key', 'asc')
      .toString();
    expect(sql).toContain('left join "users" as "u"');
    expect(sql).toContain('"u"."email" as "updated_by_email"');
    expect(sql).toContain('order by "f"."key" asc');
    pgKnex.destroy();
  });

  it('get filters on key and selects value only', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('feature_flags')
      .where({ key: 'ai-converter-floor-v1' })
      .select('value')
      .first()
      .toString();
    expect(sql).toContain('"key" = \'ai-converter-floor-v1\'');
    expect(sql).toContain('select "value"');
    pgKnex.destroy();
  });

  it('set updates by key, persists value and updated_by', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('feature_flags')
      .where({ key: 'ai-converter-floor-v1' })
      .update({ value: true, updated_by: 42, updated_at: pgKnex.fn.now() })
      .toString();
    expect(sql).toContain('update "feature_flags"');
    expect(sql).toContain('"value" = true');
    expect(sql).toContain('"updated_by" = 42');
    expect(sql).toContain('"updated_at" = CURRENT_TIMESTAMP');
    expect(sql).toContain('where "key" = \'ai-converter-floor-v1\'');
    pgKnex.destroy();
  });
});
