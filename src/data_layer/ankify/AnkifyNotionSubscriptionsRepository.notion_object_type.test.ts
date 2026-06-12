import knex, { Knex } from 'knex';

import { AnkifyNotionSubscriptionsRepository } from './AnkifyNotionSubscriptionsRepository';

async function makeDb(): Promise<Knex> {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('ankify_notion_subscriptions', (t) => {
    t.increments('id');
    t.integer('owner').notNullable();
    t.integer('ankify_client_id').notNullable();
    t.string('notion_page_id').notNullable();
    t.string('notion_page_title');
    t.string('notion_page_url');
    t.string('notion_page_icon');
    t.text('target_deck');
    t.text('notion_object_type');
    t.boolean('enabled').defaultTo(true);
    t.timestamp('last_polled_at');
    t.timestamp('last_synced_at');
    t.string('last_error');
    t.timestamp('created_at').defaultTo(db.fn.now());
    t.timestamp('updated_at').defaultTo(db.fn.now());
    t.unique(['owner', 'notion_page_id']);
  });
  return db;
}

describe('AnkifyNotionSubscriptionsRepository — notion_object_type', () => {
  let db: Knex;

  beforeEach(async () => {
    db = await makeDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('starts null and records the resolved object type', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);
    const row = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'database-id',
      enabled: true,
    });
    expect(row.notion_object_type ?? null).toBeNull();

    await repo.recordObjectType(row.id, 'database');

    const stored = await repo.findByOwnerAndPageId(42, 'database-id');
    expect(stored?.notion_object_type).toBe('database');
  });

  test('overwrites a previously recorded object type', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);
    const row = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      enabled: true,
    });
    await repo.recordObjectType(row.id, 'database');

    await repo.recordObjectType(row.id, 'page');

    const stored = await repo.findByOwnerAndPageId(42, 'page-id');
    expect(stored?.notion_object_type).toBe('page');
  });
});
