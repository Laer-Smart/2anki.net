const retrieveMock = jest.fn();
const queryMock = jest.fn();

jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    databases: { retrieve: retrieveMock },
    dataSources: { query: queryMock },
  })),
}));

import { notionDatabasePagesFetcherFactory } from './notionDatabasePagesFetcher';

describe('notionDatabasePagesFetcherFactory', () => {
  beforeEach(() => {
    retrieveMock.mockReset();
    queryMock.mockReset();
    retrieveMock.mockResolvedValue({ data_sources: [{ id: 'data-source-1' }] });
  });

  test('resolves the first data source and follows the cursor', async () => {
    queryMock
      .mockResolvedValueOnce({
        results: [{ id: 'page-1' }, { id: 'page-2' }],
        next_cursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        results: [{ id: 'page-3' }],
        next_cursor: null,
      });

    const fetch = notionDatabasePagesFetcherFactory('token');
    const pages = await fetch('database-id');

    expect(retrieveMock).toHaveBeenCalledWith({ database_id: 'database-id' });
    expect(pages).toEqual([
      { id: 'page-1' },
      { id: 'page-2' },
      { id: 'page-3' },
    ]);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0][0]).toMatchObject({
      data_source_id: 'data-source-1',
    });
    expect(queryMock.mock.calls[1][0]).toMatchObject({
      start_cursor: 'cursor-1',
    });
  });

  test('returns no pages when the database has no data source', async () => {
    retrieveMock.mockResolvedValue({ data_sources: [] });

    const fetch = notionDatabasePagesFetcherFactory('token');
    const pages = await fetch('database-id');

    expect(pages).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  test('skips rows that lack a string id', async () => {
    queryMock.mockResolvedValueOnce({
      results: [{ id: 'page-1' }, { id: 42 }, {}],
      next_cursor: null,
    });

    const fetch = notionDatabasePagesFetcherFactory('token');
    const pages = await fetch('database-id');

    expect(pages).toEqual([{ id: 'page-1' }]);
  });
});
