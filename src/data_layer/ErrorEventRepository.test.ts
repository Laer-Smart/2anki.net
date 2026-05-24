import {
  ErrorEventRepository,
  ErrorEventInsert,
} from './ErrorEventRepository';

interface StoredRow {
  id: number;
  source: string;
  message_hash: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  user_agent?: string | null;
  release?: string | null;
  user_id?: number | null;
  ip_hash?: string | null;
  context?: unknown;
  created_at: Date;
  [key: string]: unknown;
}

function makeFakeKnex() {
  let nextId = 1;
  const rows: StoredRow[] = [];

  const buildQuery = (subset: StoredRow[]) => {
    let filtered = [...subset];
    const groupByCols: string[] = [];
    let limitVal: number | null = null;
    let offsetVal = 0;
    let orderCol = 'created_at';
    let orderDir = 'desc';

    const q: {
      where: (col: string, opOrVal: unknown, val?: unknown) => typeof q;
      modify: (fn: (inner: typeof q) => void) => typeof q;
      groupBy: (...cols: string[]) => typeof q;
      select: (..._cols: unknown[]) => typeof q;
      orderBy: (col: string, dir: string) => typeof q;
      limit: (n: number) => typeof q;
      offset: (n: number) => typeof q;
      count: (_expr: string) => { first: () => Promise<{ count: number }> };
      first: () => Promise<StoredRow | undefined>;
      then: (resolve: (rows: StoredRow[]) => void, reject: (err: unknown) => void) => void;
    } = {
      where: (col: string, opOrVal: unknown, val?: unknown) => {
        const actualVal = val !== undefined ? val : opOrVal;
        if (actualVal instanceof Date) {
          filtered = filtered.filter((r) => r.created_at >= actualVal);
        } else {
          filtered = filtered.filter((r) => r[col] === actualVal);
        }
        return q;
      },
      modify: (fn: (inner: typeof q) => void) => {
        fn(q);
        return q;
      },
      groupBy: (...cols: string[]) => {
        groupByCols.push(...cols);
        return q;
      },
      select: (..._cols: unknown[]) => q,
      orderBy: (col: string, dir: string) => {
        orderCol = col;
        orderDir = dir;
        return q;
      },
      limit: (n: number) => {
        limitVal = n;
        return q;
      },
      offset: (n: number) => {
        offsetVal = n;
        return q;
      },
      count: (_expr: string) => ({
        first: () => Promise.resolve({ count: filtered.length }),
      }),
      first: () => {
        if (filtered.length === 0) return Promise.resolve(undefined);
        return Promise.resolve(filtered[0]);
      },
      then: (resolve: (rows: StoredRow[]) => void, reject: (err: unknown) => void) => {
        try {
          let result: StoredRow[] = filtered;

          if (groupByCols.length > 0) {
            const groupMap = new Map<string, StoredRow[]>();
            for (const row of filtered) {
              const key = groupByCols
                .map((c) => String(row[c] ?? ''))
                .join('|');
              const group = groupMap.get(key) ?? [];
              group.push(row);
              groupMap.set(key, group);
            }

            result = Array.from(groupMap.values()).map((group) => {
              const rep = group[0];
              const createdAts = group.map((r) => r.created_at);
              return {
                ...rep,
                occurrences: group.length,
                first_seen: createdAts.reduce((min, d) => (d < min ? d : min)),
                last_seen: createdAts.reduce((max, d) => (d > max ? d : max)),
              };
            });
          }

          if (orderCol === 'occurrences') {
            result.sort((a, b) =>
              orderDir === 'desc'
                ? Number(b.occurrences ?? 0) - Number(a.occurrences ?? 0)
                : Number(a.occurrences ?? 0) - Number(b.occurrences ?? 0)
            );
          } else {
            const col = orderCol === 'last_seen' ? 'last_seen' : 'created_at';
            result.sort((a, b) => {
              const av = new Date(String(a[col] ?? a.created_at)).getTime();
              const bv = new Date(String(b[col] ?? b.created_at)).getTime();
              return orderDir === 'desc' ? bv - av : av - bv;
            });
          }

          const paginated = result.slice(
            offsetVal,
            limitVal != null ? offsetVal + limitVal : undefined
          );
          resolve(paginated);
        } catch (err) {
          reject(err);
        }
      },
    };
    return q;
  };

  const tableWithInsert = () =>
    Object.assign(buildQuery(rows), {
      insert: (row: ErrorEventInsert) => {
        rows.push({ ...row, id: nextId++, created_at: new Date() });
        return Promise.resolve();
      },
    });

  const rawFn = jest.fn((sql: string) => ({ as: () => sql }));

  const db = Object.assign(
    ((_name: string) => tableWithInsert()) as unknown as ReturnType<typeof import('knex').default>,
    {
      raw: rawFn,
      count: (_expr: string) => ({
        from: (_sub: unknown) => ({
          first: () => Promise.resolve({ total: 0 }),
        }),
      }),
    }
  );

  return { db, rows };
}

const baseInsert: ErrorEventInsert = {
  source: 'web',
  message_hash: 'a'.repeat(64),
  message: 'TypeError: Cannot read properties of null',
  stack: 'Error at foo.ts:10',
  url: 'https://2anki.net/upload',
  ip_hash: 'b'.repeat(64),
  release: 'abc12345',
};

describe('ErrorEventRepository.insert', () => {
  it('inserts a row into the error_events table', async () => {
    const { db, rows } = makeFakeKnex();
    const repo = new ErrorEventRepository(db);
    await repo.insert(baseInsert);
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe(baseInsert.message);
    expect(rows[0].source).toBe('web');
  });
});

describe('ErrorEventRepository.existsWithinWindow', () => {
  it('returns false when no matching row exists', async () => {
    const { db } = makeFakeKnex();
    const repo = new ErrorEventRepository(db);
    const result = await repo.existsWithinWindow(
      'a'.repeat(64),
      'b'.repeat(64),
      5 * 60_000
    );
    expect(result).toBe(false);
  });

  it('returns true when a matching row exists within the window', async () => {
    const { db } = makeFakeKnex();
    const repo = new ErrorEventRepository(db);
    await repo.insert(baseInsert);
    const result = await repo.existsWithinWindow(
      baseInsert.message_hash,
      baseInsert.ip_hash!,
      5 * 60_000
    );
    expect(result).toBe(true);
  });
});
