import knex, { Knex } from 'knex';

import UsersRepository from './UsersRepository';
import { startOfMonthUtc } from '../lib/User/startOfMonthUtc';

async function makeDb(): Promise<Knex> {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('email');
    t.integer('cards_used_this_month').notNullable().defaultTo(0);
    t.timestamp('cards_month_started_at');
  });
  return db;
}

function previousMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
}

async function insertUser(
  db: Knex,
  cardsUsed: number,
  startedAt: Date
): Promise<number> {
  const [id] = await db('users').insert({
    email: 'card-usage@example.com',
    cards_used_this_month: cardsUsed,
    cards_month_started_at: startedAt,
  });
  return id;
}

async function readRow(db: Knex, id: number) {
  return db('users')
    .where({ id })
    .select('cards_used_this_month', 'cards_month_started_at')
    .first();
}

describe('UsersRepository card usage rollover (sqlite integration)', () => {
  let db: Knex;
  let repo: UsersRepository;

  beforeEach(async () => {
    db = await makeDb();
    repo = new UsersRepository(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('getCardUsage returns 0 and persists the reset when the month rolled over', async () => {
    const now = new Date();
    const id = await insertUser(db, 554, previousMonthUtc(now));

    const usage = await repo.getCardUsage(id);

    expect(usage.cards_used).toBe(0);
    const row = await readRow(db, id);
    expect(row.cards_used_this_month).toBe(0);
    expect(new Date(row.cards_month_started_at).toISOString()).toBe(
      startOfMonthUtc(now).toISOString()
    );
  });

  it('getCardUsage leaves a current-month row untouched', async () => {
    const now = new Date();
    const id = await insertUser(db, 42, startOfMonthUtc(now));

    const usage = await repo.getCardUsage(id);

    expect(usage.cards_used).toBe(42);
    const row = await readRow(db, id);
    expect(row.cards_used_this_month).toBe(42);
  });

  it('incrementCardUsage across rollover resets the counter to the increment and moves the month', async () => {
    const now = new Date();
    const id = await insertUser(db, 554, previousMonthUtc(now));

    await repo.incrementCardUsage(id, 30);

    const row = await readRow(db, id);
    expect(row.cards_used_this_month).toBe(30);
    expect(new Date(row.cards_month_started_at).toISOString()).toBe(
      startOfMonthUtc(now).toISOString()
    );
  });

  it('incrementCardUsage within the same month accumulates', async () => {
    const now = new Date();
    const id = await insertUser(db, 40, startOfMonthUtc(now));

    await repo.incrementCardUsage(id, 30);

    const row = await readRow(db, id);
    expect(row.cards_used_this_month).toBe(70);
    expect(new Date(row.cards_month_started_at).toISOString()).toBe(
      startOfMonthUtc(now).toISOString()
    );
  });
});

describe('UsersRepository.incrementCardUsage generated SQL (pg dialect)', () => {
  it('uses bound parameters for the UTC month boundary in a single atomic update', () => {
    const pg = knex({ client: 'pg' });
    const repo = new UsersRepository(pg);

    const sql = (
      repo.incrementCardUsage(7, 30) as unknown as { toString(): string }
    ).toString();

    expect(sql).toMatch(
      /^update "users" set "cards_used_this_month" = CASE WHEN cards_month_started_at < '[^']+' THEN 30 ELSE cards_used_this_month \+ 30 END, "cards_month_started_at" = CASE WHEN cards_month_started_at < '[^']+' THEN '[^']+' ELSE cards_month_started_at END where "id" = 7$/
    );
    expect(sql).not.toMatch(/date_trunc/);
  });
});
