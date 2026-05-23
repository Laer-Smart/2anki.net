import knex, { Knex } from 'knex';

import OauthIdentitiesRepository from './OauthIdentitiesRepository';
import { UsersId } from './public/Users';

describe('OauthIdentitiesRepository', () => {
  let database: Knex;
  let repo: OauthIdentitiesRepository;

  beforeEach(async () => {
    database = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await database.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.text('email').notNullable();
    });
    await database.schema.createTable('oauth_identities', (t) => {
      t.increments('id').primary();
      t.text('provider').notNullable();
      t.text('subject').notNullable();
      t
        .integer('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      t.timestamp('created_at').notNullable().defaultTo(database.fn.now());
      t.unique(['provider', 'subject']);
    });
    repo = new OauthIdentitiesRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const insertUser = async (email: string): Promise<UsersId> => {
    const [{ id }] = await database('users').insert({ email }).returning('id');
    return id as UsersId;
  };

  it('returns null when no matching identity exists', async () => {
    const row = await repo.findByProviderAndSubject('microsoft', 'sub-1');
    expect(row).toBeNull();
  });

  it('returns the identity row when one exists', async () => {
    const userId = await insertUser('user@example.com');
    await repo.link('microsoft', 'sub-1', userId);

    const row = await repo.findByProviderAndSubject('microsoft', 'sub-1');
    expect(row).toMatchObject({
      provider: 'microsoft',
      subject: 'sub-1',
      user_id: userId,
    });
  });

  it('isolates lookups by provider', async () => {
    const userId = await insertUser('user@example.com');
    await repo.link('google', 'sub-1', userId);

    const row = await repo.findByProviderAndSubject('microsoft', 'sub-1');
    expect(row).toBeNull();
  });

  it('rejects duplicate (provider, subject) inserts via the UNIQUE constraint', async () => {
    const userId1 = await insertUser('a@example.com');
    const userId2 = await insertUser('b@example.com');
    await repo.link('microsoft', 'sub-1', userId1);

    await expect(repo.link('microsoft', 'sub-1', userId2)).rejects.toThrow();
  });
});
