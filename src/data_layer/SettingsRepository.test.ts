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
});
