import knex, { Knex } from 'knex';

import TokenRepository from './TokenRepository';
import { SESSION_MAX_AGE_MS } from '../shared/session';

describe('TokenRepository', () => {
  let database: Knex;
  let repo: TokenRepository;

  beforeEach(async () => {
    database = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await database.schema.createTable('access_tokens', (t) => {
      t.integer('owner').notNullable().index();
      t.text('token').notNullable().index();
      t.timestamp('created_at').defaultTo(database.fn.now());
    });
    repo = new TokenRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const insertRow = (token: string, owner: string, createdAt: Date) =>
    database('access_tokens').insert({
      token,
      owner,
      created_at: createdAt,
    });

  const expiredDate = () => new Date(Date.now() - SESSION_MAX_AGE_MS - 1000);

  describe('updateAccessToken', () => {
    it('keeps both sessions when the same owner signs in twice', async () => {
      await repo.updateAccessToken('token-web', '1');
      await repo.updateAccessToken('token-app', '1');

      const web = await repo.getAccessTokenFromString('token-web');
      const app = await repo.getAccessTokenFromString('token-app');

      expect(web).toMatchObject({ token: 'token-web' });
      expect(app).toMatchObject({ token: 'token-app' });
    });

    it('removes only the expired rows of the signing-in owner', async () => {
      await insertRow('owner1-expired', '1', expiredDate());
      await insertRow('owner1-fresh', '1', new Date());
      await insertRow('owner2-expired', '2', expiredDate());

      await repo.updateAccessToken('owner1-new', '1');

      const tokens = (await database('access_tokens').select('token')).map(
        (row) => row.token
      );
      expect(tokens.sort()).toEqual([
        'owner1-fresh',
        'owner1-new',
        'owner2-expired',
      ]);
    });
  });

  describe('deleteAccessToken', () => {
    it('deletes only the presented token', async () => {
      await repo.updateAccessToken('token-web', '1');
      await repo.updateAccessToken('token-app', '1');

      await repo.deleteAccessToken('token-web');

      const web = await repo.getAccessTokenFromString('token-web');
      const app = await repo.getAccessTokenFromString('token-app');
      expect(web).toBeUndefined();
      expect(app).toMatchObject({ token: 'token-app' });
    });
  });

  describe('deleteAllForOwner', () => {
    it('deletes every session of that owner and nothing else', async () => {
      await repo.updateAccessToken('owner1-web', '1');
      await repo.updateAccessToken('owner1-app', '1');
      await repo.updateAccessToken('owner2-web', '2');

      await repo.deleteAllForOwner('1');

      const tokens = (await database('access_tokens').select('token')).map(
        (row) => row.token
      );
      expect(tokens).toEqual(['owner2-web']);
    });
  });

  describe('deleteExpired', () => {
    it('removes expired rows across all owners and keeps fresh ones', async () => {
      await insertRow('owner1-expired', '1', expiredDate());
      await insertRow('owner2-expired', '2', expiredDate());
      await insertRow('owner1-fresh', '1', new Date());

      const deleted = await repo.deleteExpired();

      expect(deleted).toBe(2);
      const tokens = (await database('access_tokens').select('token')).map(
        (row) => row.token
      );
      expect(tokens).toEqual(['owner1-fresh']);
    });
  });
});
