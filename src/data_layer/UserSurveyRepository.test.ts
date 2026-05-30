import knexFactory from 'knex';
import {
  UserSurveyRepository,
  InMemoryUserSurveyRepository,
} from './UserSurveyRepository';

describe('UserSurveyRepository generated SQL', () => {
  it('upserts via an insert with on-conflict do-update on the composite key', () => {
    const db = knexFactory({ client: 'pg' });

    const sql = db('user_surveys')
      .insert({
        user_id: '42',
        survey_key: 'post_login_v1',
        improvement: 'More themes',
        studying: 'Medicine',
        status: 'answered',
      })
      .onConflict(['user_id', 'survey_key'])
      .merge({
        improvement: 'More themes',
        studying: 'Medicine',
        status: 'answered',
        updated_at: new Date(),
      })
      .toString()
      .toLowerCase();

    expect(sql).toContain('insert into "user_surveys"');
    expect(sql).toContain('on conflict ("user_id", "survey_key") do update');

    return db.destroy();
  });
});

describe('InMemoryUserSurveyRepository', () => {
  it('returns undefined when no row exists for the key', async () => {
    const repository = new InMemoryUserSurveyRepository();

    await expect(
      repository.findByUserAndKey('42', 'post_login_v1')
    ).resolves.toBeUndefined();
  });

  it('finds a row after an upsert', async () => {
    const repository = new InMemoryUserSurveyRepository();

    await repository.upsert('42', 'post_login_v1', {
      improvement: null,
      studying: 'Law',
      status: 'answered',
    });

    const found = await repository.findByUserAndKey('42', 'post_login_v1');
    expect(found).toEqual({ id: 1 });
  });

  it('overwrites an existing row without changing its id', async () => {
    const repository = new InMemoryUserSurveyRepository();

    await repository.upsert('42', 'post_login_v1', {
      improvement: null,
      studying: null,
      status: 'dismissed',
    });
    const first = await repository.findByUserAndKey('42', 'post_login_v1');

    await repository.upsert('42', 'post_login_v1', {
      improvement: 'Faster',
      studying: 'Science',
      status: 'answered',
    });
    const second = await repository.findByUserAndKey('42', 'post_login_v1');

    expect(second).toEqual(first);
    expect(repository.count()).toBe(1);
    expect(repository.getData('42', 'post_login_v1')).toEqual({
      improvement: 'Faster',
      studying: 'Science',
      status: 'answered',
    });
  });
});
