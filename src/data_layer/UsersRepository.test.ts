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

describe('UsersRepository.createUserAndSeedFromTombstone', () => {
  function buildTrxKnex(tombstoneSeed: any) {
    const insertReturning = jest.fn().mockResolvedValue([{ id: 99 }]);
    const updateSpy = jest.fn().mockResolvedValue(1);
    const whereForUpdate = { update: updateSpy };
    const trx: any = jest.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          insert: jest.fn().mockReturnValue({ returning: insertReturning }),
          where: jest.fn().mockReturnValue(whereForUpdate),
        };
      }
      return {};
    });
    const transaction = jest.fn().mockImplementation(async (cb) => cb(trx));
    const knex: any = jest.fn();
    knex.transaction = transaction;
    const tombstoneRepo = {
      snapshot: jest.fn().mockResolvedValue(undefined),
      consumeIfCurrentMonth: jest.fn().mockResolvedValue(tombstoneSeed),
    };
    return { knex, tombstoneRepo, updateSpy, insertReturning };
  }

  it('inserts the user and skips the seed update when no tombstone exists', async () => {
    const { knex, tombstoneRepo, updateSpy } = buildTrxKnex(null);
    const repo = new UsersRepository(knex as any, tombstoneRepo as any);

    const result = await repo.createUserAndSeedFromTombstone(
      'al',
      SAMPLE_HASH,
      'al@example.com',
      '/notion-to-anki'
    );

    expect(result).toEqual([{ id: 99 }]);
    expect(tombstoneRepo.consumeIfCurrentMonth).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('seeds counters on the new user when a current-month tombstone is found', async () => {
    const seed = {
      cards_used_this_month: 80,
      cards_month_started_at: new Date('2026-05-01T00:00:00Z'),
      pdf_prints_this_month: 1,
      prints_month_started_at: new Date('2026-05-01T00:00:00Z'),
    };
    const { knex, tombstoneRepo, updateSpy } = buildTrxKnex(seed);
    const repo = new UsersRepository(knex as any, tombstoneRepo as any);

    await repo.createUserAndSeedFromTombstone(
      'al',
      SAMPLE_HASH,
      'al@example.com',
      null,
      new Date('2026-05-24T00:00:00Z')
    );

    expect(updateSpy).toHaveBeenCalledWith({
      cards_used_this_month: 80,
      cards_month_started_at: seed.cards_month_started_at,
      pdf_prints_this_month: 1,
      prints_month_started_at: seed.prints_month_started_at,
    });
  });
});

describe('UsersRepository.deleteUser', () => {
  it('snapshots usage to the tombstone before deleting the user', async () => {
    const userRow = {
      email: 'al@example.com',
      cards_used_this_month: 80,
      cards_month_started_at: new Date('2026-05-01T00:00:00Z'),
      pdf_prints_this_month: 1,
      prints_month_started_at: new Date('2026-05-01T00:00:00Z'),
    };
    const deleteOrder: string[] = [];
    const trx: any = jest.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          where: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              first: jest.fn().mockResolvedValue(userRow),
            }),
            del: jest.fn().mockImplementation(() => {
              deleteOrder.push('users');
              return Promise.resolve(1);
            }),
          }),
        };
      }
      return {
        where: jest.fn().mockReturnValue({
          del: jest.fn().mockImplementation(() => {
            deleteOrder.push(table);
            return Promise.resolve(1);
          }),
        }),
      };
    });
    const transaction = jest.fn().mockImplementation(async (cb) => cb(trx));
    const knex: any = jest.fn();
    knex.transaction = transaction;
    const tombstoneRepo = {
      snapshot: jest.fn().mockResolvedValue(undefined),
      consumeIfCurrentMonth: jest.fn(),
    };

    const repo = new UsersRepository(knex as any, tombstoneRepo as any);
    await repo.deleteUser('42');

    expect(tombstoneRepo.snapshot).toHaveBeenCalledTimes(1);
    const [, counters] = tombstoneRepo.snapshot.mock.calls[0];
    expect(counters).toEqual({
      cards_used_this_month: 80,
      cards_month_started_at: userRow.cards_month_started_at,
      pdf_prints_this_month: 1,
      prints_month_started_at: userRow.prints_month_started_at,
    });
    expect(deleteOrder[deleteOrder.length - 1]).toBe('users');
  });

  it('skips the snapshot when the user row has no email', async () => {
    const trx: any = jest.fn().mockImplementation(() => ({
      where: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ email: null }),
        }),
        del: jest.fn().mockResolvedValue(1),
      }),
    }));
    const transaction = jest.fn().mockImplementation(async (cb) => cb(trx));
    const knex: any = jest.fn();
    knex.transaction = transaction;
    const tombstoneRepo = {
      snapshot: jest.fn(),
      consumeIfCurrentMonth: jest.fn(),
    };

    const repo = new UsersRepository(knex as any, tombstoneRepo as any);
    await repo.deleteUser('42');

    expect(tombstoneRepo.snapshot).not.toHaveBeenCalled();
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
