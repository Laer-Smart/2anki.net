import knex, { Knex } from 'knex';

import { ReturnRateMetricsService } from './ReturnRateMetricsService';

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
  return db;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function insertJob(
  db: Knex,
  attrs: {
    owner: string;
    object_id: string;
    type: string;
    status?: string;
    created_at?: Date;
  }
) {
  await db('jobs').insert({
    owner: attrs.owner,
    object_id: attrs.object_id,
    type: attrs.type,
    status: attrs.status ?? 'done',
    created_at: attrs.created_at ?? new Date(),
    last_edited_time: new Date(),
  });
}

describe('ReturnRateMetricsService — graceful failure', () => {
  it('returns null for all windows when the db throws', async () => {
    const failing = { raw: jest.fn() } as unknown as Knex;
    const service = new ReturnRateMetricsService(failing);
    const result = await service.getMetrics();
    expect(result.by_source_type).toBeNull();
    expect(result.overall['7d']).toBeNull();
    expect(result.overall['14d']).toBeNull();
    expect(result.overall['30d']).toBeNull();
  });
});

describe('ReturnRateMetricsService — return-rate windows', () => {
  let db: Knex;
  let service: ReturnRateMetricsService;

  beforeEach(async () => {
    db = await makeDb();
    service = new ReturnRateMetricsService(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('counts a user who returned within 7 days as retained in all windows', async () => {
    await insertJob(db, {
      owner: 'u1',
      object_id: 'j-first',
      type: 'page',
      status: 'done',
      created_at: daysAgo(20),
    });
    await insertJob(db, {
      owner: 'u1',
      object_id: 'j-second',
      type: 'page',
      status: 'done',
      created_at: daysAgo(15),
    });

    const result = await service.getMetrics();

    expect(result.overall['7d']).toBeCloseTo(100, 5);
    expect(result.overall['14d']).toBeCloseTo(100, 5);
    expect(result.overall['30d']).toBeCloseTo(100, 5);
  });

  it('counts a user who only returned after 8 days as NOT in 7d window but in 14d', async () => {
    await insertJob(db, {
      owner: 'u2',
      object_id: 'j-a',
      type: 'page',
      status: 'done',
      created_at: daysAgo(40),
    });
    await insertJob(db, {
      owner: 'u2',
      object_id: 'j-b',
      type: 'page',
      status: 'done',
      created_at: new Date(daysAgo(40).getTime() + 8 * 24 * 60 * 60 * 1000),
    });

    const result = await service.getMetrics();

    expect(result.overall['7d']).toBeCloseTo(0, 5);
    expect(result.overall['14d']).toBeCloseTo(100, 5);
    expect(result.overall['30d']).toBeCloseTo(100, 5);
  });

  it('excludes non-conversion job types from the cohort', async () => {
    await insertJob(db, {
      owner: 'u3',
      object_id: 'j-c',
      type: 'claude',
      status: 'done',
      created_at: daysAgo(10),
    });
    await insertJob(db, {
      owner: 'u3',
      object_id: 'j-d',
      type: 'claude',
      status: 'done',
      created_at: daysAgo(5),
    });

    const result = await service.getMetrics();

    expect(result.overall['7d']).toBeNull();
    expect(result.overall['14d']).toBeNull();
    expect(result.overall['30d']).toBeNull();
  });

  it('breaks down return rates by source_type', async () => {
    await insertJob(db, {
      owner: 'u4',
      object_id: 'j-e',
      type: 'page',
      status: 'done',
      created_at: daysAgo(15),
    });
    await insertJob(db, {
      owner: 'u4',
      object_id: 'j-f',
      type: 'page',
      status: 'done',
      created_at: daysAgo(10),
    });
    await insertJob(db, {
      owner: 'u5',
      object_id: 'j-g',
      type: 'conversion',
      status: 'done',
      created_at: daysAgo(15),
    });

    const result = await service.getMetrics();

    const pageRow = result.by_source_type?.find(
      (r) => r.source_type === 'page'
    );
    const convRow = result.by_source_type?.find(
      (r) => r.source_type === 'conversion'
    );
    expect(pageRow?.cohort_size).toBe(1);
    expect(pageRow?.returned_7d).toBe(1);
    expect(convRow?.cohort_size).toBe(1);
    expect(convRow?.returned_7d).toBe(0);
  });

  it('uses the last successful job as the cohort anchor, not the first', async () => {
    await insertJob(db, {
      owner: 'u6',
      object_id: 'j-x1',
      type: 'page',
      status: 'done',
      created_at: daysAgo(50),
    });
    await insertJob(db, {
      owner: 'u6',
      object_id: 'j-x2',
      type: 'page',
      status: 'done',
      created_at: daysAgo(10),
    });
    await insertJob(db, {
      owner: 'u6',
      object_id: 'j-x3',
      type: 'page',
      status: 'done',
      created_at: daysAgo(5),
    });

    const result = await service.getMetrics();

    expect(result.overall['7d']).toBeCloseTo(100, 5);
  });
});
