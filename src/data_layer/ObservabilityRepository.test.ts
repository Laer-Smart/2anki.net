import {
  ObservabilityRepository,
  RequestLogRow,
  OutboundCallLogRow,
} from './ObservabilityRepository';

interface FakeStore {
  requests: Record<string, unknown>[];
  outbound: Record<string, unknown>[];
  calls: string[];
}

function makeFakeKnex() {
  const store: FakeStore = { requests: [], outbound: [], calls: [] };

  const filterRows = (
    rows: Record<string, unknown>[],
    where: Record<string, unknown>,
    fromTime: Date | null
  ) =>
    rows.filter((row) => {
      for (const [k, v] of Object.entries(where)) {
        if (row[k] !== v) return false;
      }
      if (fromTime != null) {
        const ts = row.created_at as Date;
        if (ts < fromTime) return false;
      }
      return true;
    });

  const buildBuilder = (
    rows: Record<string, unknown>[],
    where: Record<string, unknown>,
    fromTime: Date | null = null
  ) => {
    const builder: Record<string, unknown> = {};
    builder.where = (filter: Record<string, unknown>) =>
      buildBuilder(rows, { ...where, ...filter }, fromTime);
    builder.andWhere = (col: string, op: string, val: Date) => {
      if (op === '>=') {
        return buildBuilder(rows, where, val);
      }
      return builder;
    };
    builder.select = () => Promise.resolve(filterRows(rows, where, fromTime));
    builder.orderBy = () => builder;
    builder.then = (cb: (rows: Record<string, unknown>[]) => unknown) =>
      Promise.resolve(filterRows(rows, where, fromTime)).then(cb);
    return builder;
  };

  const tableHandler = (tableName: string) => {
    if (tableName === 'request_logs') {
      return {
        insert: (rows: Record<string, unknown>[]) => {
          store.calls.push(`request_logs insert ${rows.length}`);
          for (const row of rows) {
            store.requests.push({
              ...row,
              created_at: row.created_at ?? new Date(),
            });
          }
          return Promise.resolve(rows.length);
        },
        where: (filter: Record<string, unknown> = {}) =>
          buildBuilder(store.requests, filter),
        select: () => Promise.resolve(filterRows(store.requests, {}, null)),
      };
    }
    if (tableName === 'outbound_call_logs') {
      return {
        insert: (rows: Record<string, unknown>[]) => {
          store.calls.push(`outbound_call_logs insert ${rows.length}`);
          for (const row of rows) {
            store.outbound.push({
              ...row,
              created_at: row.created_at ?? new Date(),
            });
          }
          return Promise.resolve(rows.length);
        },
        where: (filter: Record<string, unknown> = {}) =>
          buildBuilder(store.outbound, filter),
        select: () => Promise.resolve(filterRows(store.outbound, {}, null)),
      };
    }
    throw new Error(`unexpected table: ${tableName}`);
  };

  const fn = ((tableName: string) => tableHandler(tableName)) as never;
  return { db: fn, store };
}

describe('ObservabilityRepository', () => {
  const baseRequest: RequestLogRow = {
    method: 'GET',
    route: '/api/upload/:id',
    status_code: 200,
    duration_ms: 42,
    created_at: new Date('2026-05-09T10:00:00Z'),
  };
  const baseOutbound: OutboundCallLogRow = {
    service: 'notion',
    endpoint: 'api.notion.com/v1/pages',
    status_code: 200,
    duration_ms: 110,
    created_at: new Date('2026-05-09T10:00:00Z'),
  };

  it('insertRequestLogs writes nothing when given an empty array', async () => {
    const { db, store } = makeFakeKnex();
    const repo = new ObservabilityRepository(db);
    await repo.insertRequestLogs([]);
    expect(store.calls).toEqual([]);
  });

  it('insertRequestLogs batches all rows in a single insert', async () => {
    const { db, store } = makeFakeKnex();
    const repo = new ObservabilityRepository(db);
    await repo.insertRequestLogs([
      baseRequest,
      { ...baseRequest, status_code: 500 },
    ]);
    expect(store.calls).toEqual(['request_logs insert 2']);
    expect(store.requests).toHaveLength(2);
  });

  it('insertOutboundCallLogs writes nothing when given an empty array', async () => {
    const { db, store } = makeFakeKnex();
    const repo = new ObservabilityRepository(db);
    await repo.insertOutboundCallLogs([]);
    expect(store.calls).toEqual([]);
  });

  it('insertOutboundCallLogs batches all rows in a single insert', async () => {
    const { db, store } = makeFakeKnex();
    const repo = new ObservabilityRepository(db);
    await repo.insertOutboundCallLogs([
      baseOutbound,
      { ...baseOutbound, service: 'claude' },
    ]);
    expect(store.calls).toEqual(['outbound_call_logs insert 2']);
    expect(store.outbound).toHaveLength(2);
  });

  it('preserves nullable status_code on outbound rows (network errors)', async () => {
    const { db, store } = makeFakeKnex();
    const repo = new ObservabilityRepository(db);
    await repo.insertOutboundCallLogs([{ ...baseOutbound, status_code: null }]);
    expect(store.outbound[0].status_code).toBeNull();
  });
});
