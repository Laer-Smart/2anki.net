import { buildNotionPageMetaFetcher } from './buildNotionPageMetaFetcher';

const DATABASE_NOT_PAGE_ERROR = Object.assign(
  new Error('aaaa is a database, not a page. Retrieve the database instead.'),
  { code: 'validation_error' }
);

const makeNotionClient = (overrides: {
  pagesRetrieve?: jest.Mock;
  databasesRetrieve?: jest.Mock;
}) => ({
  pages: { retrieve: overrides.pagesRetrieve ?? jest.fn() },
  databases: { retrieve: overrides.databasesRetrieve ?? jest.fn() },
});

describe('buildNotionPageMetaFetcher', () => {
  test('reads title, url, and icon from a page', async () => {
    const client = makeNotionClient({
      pagesRetrieve: jest.fn().mockResolvedValue({
        url: 'https://www.notion.so/page-1',
        icon: { type: 'emoji', emoji: '📘' },
        properties: {
          title: {
            type: 'title',
            title: [{ plain_text: 'Pharmacology notes' }],
          },
        },
      }),
    });

    const meta = await buildNotionPageMetaFetcher(
      'token',
      () => client
    )('page-1');

    expect(meta).toEqual({
      title: 'Pharmacology notes',
      url: 'https://www.notion.so/page-1',
      icon: '📘',
    });
  });

  test('falls back to the database title when the id is a database, not a page', async () => {
    const databasesRetrieve = jest.fn().mockResolvedValue({
      url: 'https://www.notion.so/db-1',
      icon: { type: 'emoji', emoji: '🧪' },
      title: [{ plain_text: 'Pharmacology' }],
    });
    const client = makeNotionClient({
      pagesRetrieve: jest.fn().mockRejectedValue(DATABASE_NOT_PAGE_ERROR),
      databasesRetrieve,
    });

    const meta = await buildNotionPageMetaFetcher(
      'token',
      () => client
    )('db-1');

    expect(databasesRetrieve).toHaveBeenCalledWith({ database_id: 'db-1' });
    expect(meta).toEqual({
      title: 'Pharmacology',
      url: 'https://www.notion.so/db-1',
      icon: '🧪',
    });
  });

  test('rethrows errors that are not the database-not-page validation error', async () => {
    const client = makeNotionClient({
      pagesRetrieve: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      buildNotionPageMetaFetcher('token', () => client)('page-1')
    ).rejects.toThrow('boom');
  });
});
