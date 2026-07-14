import knex from 'knex';

import { FeatureInterestRepository } from './FeatureInterestRepository';

describe('FeatureInterestRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new FeatureInterestRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('inserts a row with the interest columns', () => {
    const { sql } = repository
      .buildRecordQuery({
        feature_key: 'study_reminders',
        user_id: 42,
        anonymous_id: null,
        comment: 'would use daily',
      })
      .toSQL();

    expect(sql).toBe(
      'insert into "feature_interest" ' +
        '("anonymous_id", "comment", "feature_key", "user_id") ' +
        'values (?, ?, ?, ?)'
    );
  });

  it('binds the values in column order', () => {
    const { bindings } = repository
      .buildRecordQuery({
        feature_key: 'study_reminders',
        user_id: 42,
        anonymous_id: null,
        comment: 'would use daily',
      })
      .toSQL();

    expect(bindings).toEqual([null, 'would use daily', 'study_reminders', 42]);
  });

  it('groups the counts by feature key ordered by count desc', () => {
    const { sql } = repository.buildCountQuery().toSQL();
    expect(sql).toBe(
      'select "feature_key", count(*) as "count" from "feature_interest" ' +
        'group by "feature_key" order by "count" desc'
    );
  });
});
