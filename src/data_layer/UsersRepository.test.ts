import Knex from 'knex';
import KnexConfig from '../KnexConfig';
import UsersRepository from './UsersRepository';

function buildKnexMock() {
  const updateSpy = jest.fn().mockResolvedValue(1);
  const whereRawSpy = jest.fn().mockReturnValue({ update: updateSpy });
  const whereSpy = jest.fn().mockReturnValue({ update: updateSpy });
  const tableBuilder = { whereRaw: whereRawSpy, where: whereSpy };
  const knex = jest.fn().mockReturnValue(tableBuilder) as unknown as jest.Mock & {
    whereRawSpy: jest.Mock;
    whereSpy: jest.Mock;
    updateSpy: jest.Mock;
  };
  knex.whereRawSpy = whereRawSpy;
  knex.whereSpy = whereSpy;
  knex.updateSpy = updateSpy;
  return knex;
}

const SAMPLE_HASH = 'hashed-pw';

describe('UsersRepository.createUser', () => {
  it('persists signup_origin when provided', async () => {
    const insertSpy = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    });
    const tableBuilder = { insert: insertSpy };
    const knex = jest.fn().mockReturnValue(tableBuilder);
    const repo = new UsersRepository(knex as any);

    await repo.createUser(
      'al',
      SAMPLE_HASH,
      'al@example.com',
      '/notion-to-anki'
    );

    expect(insertSpy).toHaveBeenCalledWith({
      name: 'al',
      password: SAMPLE_HASH,
      email: 'al@example.com',
      signup_origin: '/notion-to-anki',
    });
  });

  it('defaults signup_origin to null when the caller omits it', async () => {
    const insertSpy = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    });
    const tableBuilder = { insert: insertSpy };
    const knex = jest.fn().mockReturnValue(tableBuilder);
    const repo = new UsersRepository(knex as any);

    await repo.createUser('al', SAMPLE_HASH, 'al@example.com');

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ signup_origin: null })
    );
  });
});

describe('UsersRepository.getByEmail', () => {
  it('uses LOWER(TRIM(email)) so mixed-case stored emails still match', async () => {
    const firstSpy = jest.fn().mockResolvedValue({ id: 1, email: 'user@example.com' });
    const whereRawSpy = jest.fn().mockReturnValue({ first: firstSpy });
    const knex = jest.fn().mockReturnValue({ whereRaw: whereRawSpy }) as unknown as jest.Mock;
    const repo = new UsersRepository(knex as any);

    await repo.getByEmail('  User@Example.COM  ');

    expect(whereRawSpy).toHaveBeenCalledWith(
      'LOWER(TRIM(email)) = LOWER(?)',
      ['  User@Example.COM  '.trim()]
    );
  });
});

describe('UsersRepository.updatePatreonByEmail', () => {
  it('matches the user by email using TRIM + lowercase so Stripe casing differences still update', async () => {
    const knex = buildKnexMock();
    const repo = new UsersRepository(knex as any);

    await repo.updatePatreonByEmail('  John@Example.COM ', true);

    expect(knex.whereRawSpy).toHaveBeenCalledWith(
      'TRIM(LOWER(email)) = ?',
      ['john@example.com']
    );
    expect(knex.updateSpy).toHaveBeenCalledWith({ patreon: true });
  });

  it('returns the number of rows affected', async () => {
    const knex = buildKnexMock();
    knex.updateSpy.mockResolvedValue(1);
    const repo = new UsersRepository(knex as any);

    const rowsAffected = await repo.updatePatreonByEmail(
      'user@example.com',
      true
    );

    expect(rowsAffected).toBe(1);
  });
});

const RUN_INTEGRATION = process.env.DATABASE_URL != null;

(RUN_INTEGRATION ? describe : describe.skip)(
  'UsersRepository.deleteUser — FK cascade (integration)',
  () => {
    const db = Knex(KnexConfig);
    let userId: number;

    beforeEach(async () => {
      const rows = await db('users')
        .insert({
          name: 'cascade-test',
          email: `cascade-test-${Date.now()}@example.com`,
          password: SAMPLE_HASH,
        })
        .returning('id');
      userId = rows[0].id;

      await db('inactivity_emails').insert({
        user_id: userId,
        token: `inactivity-tok-${userId}`,
      });

      await db('re_engagement_emails').insert({
        user_id: userId,
        token: `reengagement-tok-${userId}`,
      });
    });

    afterEach(async () => {
      await db('inactivity_emails').where({ user_id: userId }).del();
      await db('re_engagement_emails').where({ user_id: userId }).del();
      await db('users').where({ id: userId }).del();
    });

    afterAll(() => db.destroy());

    it('removes the user and cascades to inactivity_emails and re_engagement_emails', async () => {
      const repo = new UsersRepository(db);

      await repo.deleteUser(String(userId));

      const user = await db('users').where({ id: userId }).first();
      const inactivity = await db('inactivity_emails').where({ user_id: userId }).first();
      const reEngagement = await db('re_engagement_emails').where({ user_id: userId }).first();

      expect(user).toBeUndefined();
      expect(inactivity).toBeUndefined();
      expect(reEngagement).toBeUndefined();
    });
  }
);
