import knex, { Knex } from 'knex';

import { JobsMetricsRepository } from './JobsMetricsRepository';

async function makeDb(): Promise<Knex> {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('jobs', (t) => {
    t.increments('id');
    t.string('owner').notNullable();
    t.string('object_id').notNullable();
    t.string('title');
    t.string('type');
    t.string('status');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('last_edited_time');
    t.string('job_reason_failure');
    t.integer('card_count');
  });
  await db.schema.createTable('users', (t) => {
    t.string('id').primary();
    t.string('stripe_customer_id');
  });
  return db;
}

async function insertUser(db: Knex, id: string, stripeCustomerId: string | null) {
  await db('users').insert({ id, stripe_customer_id: stripeCustomerId });
}

async function insertJob(
  db: Knex,
  attrs: {
    owner: string;
    object_id: string;
    type: string;
    status?: string;
    created_at?: Date;
    job_reason_failure?: string;
  }
) {
  await db('jobs').insert({
    owner: attrs.owner,
    object_id: attrs.object_id,
    type: attrs.type,
    status: attrs.status ?? 'done',
    created_at: attrs.created_at ?? new Date(),
    last_edited_time: new Date(),
    job_reason_failure: attrs.job_reason_failure ?? null,
  });
}

describe('JobsMetricsRepository — counts cover the real Notion job types', () => {
  let db: Knex;
  let repo: JobsMetricsRepository;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    db = await makeDb();
    repo = new JobsMetricsRepository(db);
    await insertUser(db, 'free-user', null);
    await insertUser(db, 'paid-user', 'cus_paid');
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('counts free conversions stored as type=page or type=database', async () => {
    await insertJob(db, { owner: 'free-user', object_id: 'p-1', type: 'page' });
    await insertJob(db, { owner: 'free-user', object_id: 'p-2', type: 'database' });
    await insertJob(db, { owner: 'free-user', object_id: 'p-3', type: 'conversion' });

    const count = await repo.countFreeConversions7d(sevenDaysAgo);

    expect(count).toBe(3);
  });

  it('counts paid conversions stored as type=page or type=database', async () => {
    await insertJob(db, { owner: 'paid-user', object_id: 'p-4', type: 'page' });
    await insertJob(db, { owner: 'paid-user', object_id: 'p-5', type: 'database' });

    const count = await repo.countPaidConversions7d(sevenDaysAgo);

    expect(count).toBe(2);
  });

  it('ignores apkg_import and claude (ankify) jobs for free count', async () => {
    await insertJob(db, { owner: 'free-user', object_id: 'a-1', type: 'apkg_import' });
    await insertJob(db, { owner: 'free-user', object_id: 'a-2', type: 'claude' });

    const count = await repo.countFreeConversions7d(sevenDaysAgo);

    expect(count).toBe(0);
  });

  it('computes free success rate over page+database+conversion jobs', async () => {
    await insertJob(db, { owner: 'free-user', object_id: 's-1', type: 'page', status: 'done' });
    await insertJob(db, { owner: 'free-user', object_id: 's-2', type: 'database', status: 'done' });
    await insertJob(db, { owner: 'free-user', object_id: 's-3', type: 'page', status: 'failed' });

    const rate = await repo.computeFreeSuccessRate7d(sevenDaysAgo);

    expect(rate).toBeCloseTo((2 / 3) * 100, 5);
  });

  it('returns null free success rate when there are no qualifying jobs', async () => {
    const rate = await repo.computeFreeSuccessRate7d(sevenDaysAgo);

    expect(rate).toBeNull();
  });

  it('returns null paid success rate when there are no qualifying jobs', async () => {
    const rate = await repo.computePaidSuccessRate7d(sevenDaysAgo);

    expect(rate).toBeNull();
  });

  it('groups top failure reasons across Notion job types', async () => {
    await insertJob(db, {
      owner: 'free-user',
      object_id: 'f-1',
      type: 'page',
      status: 'failed',
      job_reason_failure: 'rate limit',
    });
    await insertJob(db, {
      owner: 'free-user',
      object_id: 'f-2',
      type: 'database',
      status: 'failed',
      job_reason_failure: 'rate limit',
    });
    await insertJob(db, {
      owner: 'paid-user',
      object_id: 'f-3',
      type: 'page',
      status: 'failed',
      job_reason_failure: 'timeout',
    });

    const reasons = await repo.topFailureReasons7d(sevenDaysAgo);

    expect(reasons).toEqual([
      { reason: 'rate limit', count: 2 },
      { reason: 'timeout', count: 1 },
    ]);
  });
});
