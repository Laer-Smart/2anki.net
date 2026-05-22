import { MindmapRepository } from './MindmapRepository';
import { MindmapsId } from './public/Mindmaps';
import { UsersId } from './public/Users';
import { MindmapData } from '../usecases/mindmaps/MindmapData';

function makeRow(overrides: Partial<{
  id: string;
  user_id: number;
  title: string;
  data: MindmapData;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: 'uuid-1' as MindmapsId,
    user_id: 1 as UsersId,
    title: 'Untitled',
    data: { nodes: [], edges: [] } as MindmapData,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeFakeKnex(initialRows: ReturnType<typeof makeRow>[] = []) {
  const store = { rows: [...initialRows] };

  const buildChain = (filter?: (r: ReturnType<typeof makeRow>) => boolean) => {
    const chain = {
      where(cond: Record<string, unknown>) {
        const prev = filter;
        const newFilter = (r: ReturnType<typeof makeRow>) => {
          const prevOk = prev ? prev(r) : true;
          const condOk = Object.entries(cond).every(([k, v]) => (r as Record<string, unknown>)[k] === v);
          return prevOk && condOk;
        };
        return buildChain(newFilter);
      },
      select(_cols: string) {
        return this;
      },
      orderBy(_col: string, _dir: string) {
        return this;
      },
      first() {
        const filtered = filter ? store.rows.filter(filter) : store.rows;
        return Promise.resolve(filtered[0] ?? undefined);
      },
      returning(_col: string) {
        return this;
      },
      update(patch: Record<string, unknown>) {
        store.rows = store.rows.map((r) => {
          const match = filter ? filter(r) : false;
          return match ? { ...r, ...patch } : r;
        });
        const filtered = filter ? store.rows.filter(filter) : [];
        return Promise.resolve(filtered);
      },
      del() {
        const before = store.rows.length;
        store.rows = filter ? store.rows.filter((r) => !filter(r)) : [];
        return Promise.resolve(before - store.rows.length);
      },
      count(_alias: string) {
        const filtered = filter ? store.rows.filter(filter) : store.rows;
        return Promise.resolve([{ count: String(filtered.length) }]);
      },
      then(resolve: (v: ReturnType<typeof makeRow>[]) => void) {
        const filtered = filter ? store.rows.filter(filter) : store.rows;
        return Promise.resolve(filtered).then(resolve);
      },
    };
    return chain;
  };

  const db = (table: string) => {
    void table;
    return {
      ...buildChain(),
      insert(row: ReturnType<typeof makeRow>) {
        const inserted = {
          id: row.id ?? ('new-uuid' as MindmapsId),
          user_id: row.user_id,
          title: row.title ?? 'Untitled',
          data: row.data ?? { nodes: [], edges: [] },
          created_at: row.created_at ?? new Date(),
          updated_at: row.updated_at ?? new Date(),
        } as ReturnType<typeof makeRow>;
        store.rows.push(inserted);
        return {
          returning(_col: string) {
            return Promise.resolve([inserted]);
          },
        };
      },
    };
  };

  db._store = store;
  return db as unknown as ConstructorParameters<typeof MindmapRepository>[0] & { _store: typeof store };
}

describe('MindmapRepository', () => {
  it('creates a mindmap and returns it', async () => {
    const db = makeFakeKnex();
    const repo = new MindmapRepository(db);
    const data: MindmapData = { nodes: [{ id: '1', label: 'Root' }], edges: [] };

    const result = await repo.create({
      user_id: 1 as UsersId,
      title: 'Test map',
      data,
    });

    expect(result.title).toBe('Test map');
    expect(result.data).toEqual(data);
  });

  it('finds a mindmap by id and user', async () => {
    const existing = makeRow({ id: 'abc', user_id: 42 as UsersId });
    const db = makeFakeKnex([existing]);
    const repo = new MindmapRepository(db);

    const result = await repo.findById('abc' as MindmapsId, 42 as UsersId);
    expect(result?.id).toBe('abc');
  });

  it('returns null when mindmap not found', async () => {
    const db = makeFakeKnex([]);
    const repo = new MindmapRepository(db);

    const result = await repo.findById('nope' as MindmapsId, 1 as UsersId);
    expect(result).toBeNull();
  });

  it('lists mindmaps by user', async () => {
    const db = makeFakeKnex([
      makeRow({ id: 'a', user_id: 1 as UsersId }),
      makeRow({ id: 'b', user_id: 2 as UsersId }),
      makeRow({ id: 'c', user_id: 1 as UsersId }),
    ]);
    const repo = new MindmapRepository(db);

    const result = await repo.findByUserId(1 as UsersId);
    expect(result.length).toBe(2);
  });

  it('counts mindmaps by user', async () => {
    const db = makeFakeKnex([
      makeRow({ id: 'a', user_id: 5 as UsersId }),
      makeRow({ id: 'b', user_id: 5 as UsersId }),
      makeRow({ id: 'c', user_id: 9 as UsersId }),
    ]);
    const repo = new MindmapRepository(db);

    const count = await repo.countByUserId(5 as UsersId);
    expect(count).toBe(2);
  });

  it('deletes a mindmap', async () => {
    const db = makeFakeKnex([makeRow({ id: 'del-me', user_id: 1 as UsersId })]);
    const repo = new MindmapRepository(db);

    await repo.delete('del-me' as MindmapsId, 1 as UsersId);
    const found = await repo.findById('del-me' as MindmapsId, 1 as UsersId);
    expect(found).toBeNull();
  });
});
