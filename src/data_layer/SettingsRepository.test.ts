import knexLib, { Knex } from 'knex';
import SettingsRepository from './SettingsRepository';

const TEMPLATES_PAYLOAD = [
  {
    parent: 'Basic',
    name: 'ATTI BASIC',
    storageKey: 'n2a-basic',
    front: '<div class="atti">{{Front}}</div>',
    back: '<div class="atti-back">{{Back}}</div>',
    styling: '.atti { color: tomato; }',
  },
];

describe('SettingsRepository.loadAnkifyTemplateOverrides', () => {
  let db: Knex;
  let repo: SettingsRepository;

  beforeEach(async () => {
    db = knexLib({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('settings', (t) => {
      t.string('owner');
      t.string('object_id');
      t.string('title');
      t.json('payload');
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
    await db.schema.createTable('templates', (t) => {
      t.string('owner');
      t.json('payload');
    });
    await db.schema.createTable('users', (t) => {
      t.integer('id');
      t.json('card_options');
    });
    repo = new SettingsRepository(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('returns the override when settings.template is "custom" and a basic template is saved', async () => {
    await db('settings').insert({
      owner: '42',
      object_id: 'page-a',
      title: 'A',
      payload: JSON.stringify({
        payload: { template: 'custom', basic_model_name: 'ATTI BASIC' },
      }),
      updated_at: db.fn.now(),
    });
    await db('templates').insert({
      owner: '42',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('42');

    expect(overrides).not.toBeNull();
    expect(overrides?.basicModelName).toBe('ATTI BASIC');
    expect(overrides?.basicTemplate.front).toContain('atti');
    expect(overrides?.basicTemplate.styling).toContain('tomato');
  });

  test('returns null when template is not "custom"', async () => {
    await db('settings').insert({
      owner: '42',
      object_id: 'page-a',
      title: 'A',
      payload: JSON.stringify({
        payload: { template: 'specialstyle1', basic_model_name: 'ATTI BASIC' },
      }),
    });
    await db('templates').insert({
      owner: '42',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('42');

    expect(overrides).toBeNull();
  });

  test('returns null when there is no templates row even though template === custom', async () => {
    await db('settings').insert({
      owner: '42',
      object_id: 'page-a',
      title: 'A',
      payload: JSON.stringify({
        payload: { template: 'custom', basic_model_name: 'ATTI BASIC' },
      }),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('42');

    expect(overrides).toBeNull();
  });

  test('returns null when the owner has no settings rows at all', async () => {
    const overrides = await repo.loadAnkifyTemplateOverrides('99');
    expect(overrides).toBeNull();
  });

  test('falls back to users.card_options when the owner has no settings row but set a custom template globally', async () => {
    await db('users').insert({
      id: 13574,
      card_options: JSON.stringify({
        template: 'custom',
        basic_model_name: 'ATTI BASIC',
      }),
    });
    await db('templates').insert({
      owner: '13574',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('13574');

    expect(overrides).not.toBeNull();
    expect(overrides?.basicModelName).toBe('ATTI BASIC');
    expect(overrides?.basicTemplate.front).toContain('atti');
  });

  test('prefers a per-page settings row over global card_options', async () => {
    await db('users').insert({
      id: 13574,
      card_options: JSON.stringify({
        template: 'custom',
        basic_model_name: 'GLOBAL NAME',
      }),
    });
    await db('settings').insert({
      owner: '13574',
      object_id: 'page-a',
      title: 'A',
      payload: JSON.stringify({
        payload: { template: 'custom', basic_model_name: 'PAGE NAME' },
      }),
    });
    await db('templates').insert({
      owner: '13574',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('13574', 'page-a');

    expect(overrides?.basicModelName).toBe('PAGE NAME');
  });

  test('honors the synced page row even when a newer non-custom row for another page exists', async () => {
    await db('settings').insert({
      owner: '42',
      object_id: 'synced-page',
      title: 'Synced',
      payload: JSON.stringify({
        payload: { template: 'custom', basic_model_name: 'ATTI BASIC' },
      }),
      updated_at: '2026-06-01 00:00:00',
    });
    await db('settings').insert({
      owner: '42',
      object_id: 'other-page',
      title: 'Other',
      payload: JSON.stringify({
        payload: { template: 'specialstyle1' },
      }),
      updated_at: '2026-06-10 00:00:00',
    });
    await db('templates').insert({
      owner: '42',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides(
      '42',
      'synced-page'
    );

    expect(overrides).not.toBeNull();
    expect(overrides?.basicModelName).toBe('ATTI BASIC');
  });

  test('falls back to global card_options when the synced page has no custom row', async () => {
    await db('users').insert({
      id: 42,
      card_options: JSON.stringify({
        template: 'custom',
        basic_model_name: 'GLOBAL NAME',
      }),
    });
    await db('settings').insert({
      owner: '42',
      object_id: 'synced-page',
      title: 'Synced',
      payload: JSON.stringify({
        payload: { template: 'specialstyle1' },
      }),
      updated_at: '2026-06-10 00:00:00',
    });
    await db('templates').insert({
      owner: '42',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides(
      '42',
      'synced-page'
    );

    expect(overrides?.basicModelName).toBe('GLOBAL NAME');
  });

  test('returns null when global card_options template is not custom', async () => {
    await db('users').insert({
      id: 13574,
      card_options: JSON.stringify({
        template: 'specialstyle1',
        basic_model_name: 'ATTI BASIC',
      }),
    });
    await db('templates').insert({
      owner: '13574',
      payload: JSON.stringify(TEMPLATES_PAYLOAD),
    });

    const overrides = await repo.loadAnkifyTemplateOverrides('13574');

    expect(overrides).toBeNull();
  });
});
