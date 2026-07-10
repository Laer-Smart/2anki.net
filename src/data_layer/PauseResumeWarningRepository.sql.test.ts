import knex from 'knex';
import PauseResumeWarningRepository from './PauseResumeWarningRepository';

describe('PauseResumeWarningRepository generated SQL', () => {
  const pg = knex({ client: 'pg' });
  const repository = new PauseResumeWarningRepository(pg);

  afterAll(async () => {
    await pg.destroy();
  });

  it('selects paused subscriptions by the jsonb resumes_at window', () => {
    const { sql, bindings } = repository
      .buildPausedResumingQuery(1000, 2000)
      .toSQL();

    expect(sql).toContain('"subscriptions"');
    expect(sql).toContain(
      "(payload::jsonb #>> '{pause_collection,resumes_at}')::bigint between ? and ?"
    );
    expect(bindings).toEqual([1000, 2000]);
  });
});
