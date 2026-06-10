import knex, { Knex } from 'knex';
import {
  InMemoryPriceLockInEmailRepository,
  PriceLockInEmailRepository,
} from './PriceLockInEmailRepository';

describe('PriceLockInEmailRepository segment', () => {
  let database: Knex;
  let repo: PriceLockInEmailRepository;

  beforeEach(async () => {
    database = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    await database.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.text('email').notNullable().unique();
      t.boolean('patreon');
      t.timestamp('created_at').notNullable();
    });

    await database.schema.createTable('subscriptions', (t) => {
      t.increments('id').primary();
      t.text('email');
      t.text('linked_email');
      t.boolean('active').notNullable().defaultTo(false);
    });

    await database.schema.createTable('user_passes', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable();
      t.timestamp('expires_at').notNullable();
    });

    await database.schema.createTable('email_preferences', (t) => {
      t.integer('user_id').primary();
      t.boolean('marketing_opt_out').notNullable().defaultTo(false);
    });

    await database.schema.createTable('price_lock_in_emails', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable();
      t.text('token').unique();
      t.text('variant');
      t.timestamp('sent_at').notNullable().defaultTo(database.fn.now());
    });

    repo = new PriceLockInEmailRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  async function insertUser(
    email: string,
    overrides: { patreon?: boolean; ageDays?: number } = {}
  ): Promise<number> {
    const ageDays = overrides.ageDays ?? 30;
    const createdAt = new Date(
      Date.now() - ageDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const [row] = await database('users')
      .insert({
        email,
        patreon: overrides.patreon ?? false,
        created_at: createdAt,
      })
      .returning('id');
    return typeof row === 'object' ? row.id : row;
  }

  it('includes a free account older than 14 days', async () => {
    await insertUser('free@example.com');

    const users = await repo.getUsersToNotify();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('free@example.com');
  });

  it('excludes a user created less than 14 days ago', async () => {
    await insertUser('new@example.com', { ageDays: 3 });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('excludes a lifetime (patreon) user', async () => {
    await insertUser('lifetime@example.com', { patreon: true });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('excludes a user with an active subscription matched by email', async () => {
    await insertUser('paying@example.com');
    await database('subscriptions').insert({
      email: 'paying@example.com',
      active: true,
    });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('excludes a user with an active subscription matched by linked_email', async () => {
    await insertUser('linked@example.com');
    await database('subscriptions').insert({
      linked_email: 'linked@example.com',
      active: true,
    });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('includes a user whose only subscription is inactive', async () => {
    await insertUser('cancelled@example.com');
    await database('subscriptions').insert({
      email: 'cancelled@example.com',
      active: false,
    });

    expect(await repo.getUsersToNotify()).toHaveLength(1);
  });

  it('excludes a user with an active (unexpired) pass', async () => {
    const userId = await insertUser('pass@example.com');
    await database('user_passes').insert({
      user_id: userId,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('includes a user whose pass has expired', async () => {
    const userId = await insertUser('expired-pass@example.com');
    await database('user_passes').insert({
      user_id: userId,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    expect(await repo.getUsersToNotify()).toHaveLength(1);
  });

  it('excludes a user who opted out of marketing', async () => {
    const userId = await insertUser('optout@example.com');
    await database('email_preferences').insert({
      user_id: userId,
      marketing_opt_out: true,
    });

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('excludes a user who was already sent the email', async () => {
    const userId = await insertUser('already@example.com');
    await repo.recordSend(userId, 'token-already', 'a');

    expect(await repo.getUsersToNotify()).toHaveLength(0);
  });

  it('countUsersToNotify matches the eligible segment size', async () => {
    await insertUser('a@example.com');
    await insertUser('b@example.com');
    await insertUser('lifetime@example.com', { patreon: true });

    expect(await repo.countUsersToNotify()).toBe(2);
  });

  it('findByToken resolves a recorded send to its userId', async () => {
    const userId = await insertUser('lookup@example.com');
    await repo.recordSend(userId, 'lookup-token', 'b');

    const result = await repo.findByToken('lookup-token');

    expect(result).not.toBeNull();
    expect(result?.userId).toBe(userId);
  });

  it('findByToken returns null for an unknown token', async () => {
    expect(await repo.findByToken('ghost')).toBeNull();
  });
});

describe('PriceLockInEmailRepository generated SQL (postgres dialect)', () => {
  let pg: Knex;

  beforeAll(() => {
    pg = knex({ client: 'pg' });
  });

  afterAll(async () => {
    await pg.destroy();
  });

  it('builds valid count SQL with the four exclusion subqueries', () => {
    const repo = new PriceLockInEmailRepository(pg);
    const sql = (
      repo as unknown as {
        buildSegmentQuery: () => Knex.QueryBuilder;
      }
    )
      .buildSegmentQuery()
      .countDistinct('users.email as count')
      .toString();

    expect(sql).toContain('count(distinct "users"."email") as "count"');
    expect(sql).toContain('users.patreon IS NOT TRUE');
    expect(sql).toContain(
      'subscriptions.email = users.email OR subscriptions.linked_email = users.email'
    );
    expect(sql).toContain('user_passes.user_id = users.id');
    expect(sql).toContain('price_lock_in_emails.user_id = users.id');
    expect(sql).toContain('email_preferences.user_id = users.id');
  });

  it('builds dedupe-by-email selection SQL', () => {
    const repo = new PriceLockInEmailRepository(pg);
    const sql = (
      repo as unknown as {
        buildSegmentQuery: () => Knex.QueryBuilder;
      }
    )
      .buildSegmentQuery()
      .groupBy('users.email')
      .select('users.email')
      .min('users.id as id')
      .toString();

    expect(sql).toContain('group by "users"."email"');
    expect(sql).toContain('min("users"."id") as "id"');
  });
});

describe('InMemoryPriceLockInEmailRepository', () => {
  it('returns seeded users that have not been sent', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 1, email: 'a@example.com' },
      { id: 2, email: 'b@example.com' },
    ]);

    expect(await repo.getUsersToNotify()).toHaveLength(2);
    expect(await repo.countUsersToNotify()).toBe(2);
  });

  it('excludes users already sent and records the variant', async () => {
    const repo = new InMemoryPriceLockInEmailRepository();
    repo.seedUsers([
      { id: 1, email: 'a@example.com' },
      { id: 2, email: 'b@example.com' },
    ]);
    await repo.recordSend(1, 'tok-1', 'a');

    const remaining = await repo.getUsersToNotify();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(2);
    expect(repo.getSentEmails()).toEqual([
      { id: 1, userId: 1, token: 'tok-1', variant: 'a' },
    ]);
  });
});
