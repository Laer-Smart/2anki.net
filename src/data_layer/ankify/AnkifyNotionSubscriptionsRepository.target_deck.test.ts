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

describe('AnkifyNotionSubscriptionsRepository — target_deck', () => {
  let db: Knex;

  beforeEach(async () => {
    db = await makeDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('persists target_deck on insert', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);

    const row = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: 'MS3::Pharmacology',
      enabled: true,
    });

    expect(row.target_deck).toBe('MS3::Pharmacology');
  });

  test('updates target_deck on conflict merge', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);
    await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: 'MS3::Pharmacology',
      enabled: true,
    });

    const updated = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: 'MS3::Surgery::Small Bowel',
      enabled: true,
    });

    expect(updated.target_deck).toBe('MS3::Surgery::Small Bowel');
  });

  test('leaves an existing target_deck untouched when the field is omitted', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);
    await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: 'MS3::Pharmacology',
      enabled: true,
    });

    const merged = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      notion_page_title: 'Pharmacology',
      enabled: true,
    });

    expect(merged.target_deck).toBe('MS3::Pharmacology');
  });

  test('resets target_deck to null when passed null', async () => {
    const repo = new AnkifyNotionSubscriptionsRepository(db);
    await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: 'MS3::Pharmacology',
      enabled: true,
    });

    const reset = await repo.upsert({
      owner: 42,
      ankify_client_id: 1,
      notion_page_id: 'page-id',
      target_deck: null,
      enabled: true,
    });

    expect(reset.target_deck).toBeNull();
  });
});
