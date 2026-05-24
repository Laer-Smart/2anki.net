import { collapseDataSourcesToDatabases } from './collapseDataSourcesToDatabases';

function makeResponse(results: unknown[]): {
  object: 'list';
  results: unknown[];
  next_cursor: string | null;
  has_more: boolean;
  type: 'page_or_data_source';
  page_or_data_source: Record<string, never>;
  request_id: string;
} {
  return {
    object: 'list',
    results,
    next_cursor: null,
    has_more: false,
    type: 'page_or_data_source',
    page_or_data_source: {},
    request_id: 'test',
  };
}

describe('collapseDataSourcesToDatabases', () => {
  it('rewrites data_source results to database with the parent database_id', () => {
    const ds = {
      object: 'data_source',
      id: 'ds-1',
      title: [{ plain_text: 'Good news' }],
      parent: { type: 'database_id', database_id: 'db-1' },
      url: 'https://www.notion.so/x',
    };
    const out = collapseDataSourcesToDatabases(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeResponse([ds]) as any
    );
    expect(out.results).toHaveLength(1);
    const r = out.results[0] as unknown as {
      object: string;
      id: string;
      title: unknown;
    };
    expect(r.object).toBe('database');
    expect(r.id).toBe('db-1');
    expect(r.title).toEqual([{ plain_text: 'Good news' }]);
  });

  it('drops a data_source whose parent database is already in the results', () => {
    const ds = {
      object: 'data_source',
      id: 'ds-1',
      title: [{ plain_text: 'Good news' }],
      parent: { type: 'database_id', database_id: 'db-1' },
    };
    const db = { object: 'database', id: 'db-1', title: [] };
    const out = collapseDataSourcesToDatabases(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeResponse([db, ds]) as any
    );
    expect(out.results).toHaveLength(1);
    expect((out.results[0] as { object: string }).object).toBe('database');
    expect((out.results[0] as { id: string }).id).toBe('db-1');
  });

  it('drops sibling data_sources that share a parent database', () => {
    const ds1 = {
      object: 'data_source',
      id: 'ds-1',
      parent: { type: 'database_id', database_id: 'db-1' },
    };
    const ds2 = {
      object: 'data_source',
      id: 'ds-2',
      parent: { type: 'database_id', database_id: 'db-1' },
    };
    const out = collapseDataSourcesToDatabases(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeResponse([ds1, ds2]) as any
    );
    expect(out.results).toHaveLength(1);
    expect((out.results[0] as { id: string }).id).toBe('db-1');
  });

  it('drops a data_source with no parent database_id', () => {
    const orphan = {
      object: 'data_source',
      id: 'ds-orphan',
      parent: { type: 'workspace' },
    };
    const out = collapseDataSourcesToDatabases(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeResponse([orphan]) as any
    );
    expect(out.results).toHaveLength(0);
  });

  it('leaves pages untouched', () => {
    const page = { object: 'page', id: 'p-1', url: 'https://x' };
    const out = collapseDataSourcesToDatabases(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeResponse([page]) as any
    );
    expect(out.results).toHaveLength(1);
    expect((out.results[0] as { object: string }).object).toBe('page');
  });
});
