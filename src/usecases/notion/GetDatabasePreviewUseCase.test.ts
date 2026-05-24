import { GetDatabasePreviewUseCase } from './GetDatabasePreviewUseCase';

interface QueryRow {
  properties: Record<string, unknown>;
}

interface FakeAPI {
  getDatabase: jest.Mock;
  getDatabaseTitle: jest.Mock;
  queryDatabasePreview: jest.Mock;
}

function fakeApi(overrides: Partial<FakeAPI> = {}): FakeAPI {
  return {
    getDatabase: jest.fn().mockResolvedValue({ object: 'database', url: 'https://notion.so/abc' }),
    getDatabaseTitle: jest.fn().mockResolvedValue('Vocabulary'),
    queryDatabasePreview: jest.fn().mockResolvedValue({
      results: [] as QueryRow[],
      hasMore: false,
      totalRowCount: 0,
    }),
    ...overrides,
  };
}

function titleProp(text: string) {
  return { type: 'title', title: [{ plain_text: text }] };
}

function richTextProp(text: string) {
  return { type: 'rich_text', rich_text: [{ plain_text: text }] };
}

describe('GetDatabasePreviewUseCase', () => {
  it('returns clean mapping when columns infer cleanly', async () => {
    const api = fakeApi({
      queryDatabasePreview: jest.fn().mockResolvedValue({
        results: [
          {
            properties: {
              Word: titleProp('Osmosis'),
              Definition: richTextProp('Movement of water'),
              Tags: { type: 'multi_select', multi_select: [{ name: 'Bio' }] },
            },
          },
          {
            properties: {
              Word: titleProp('Mitosis'),
              Definition: richTextProp('Cell division'),
              Tags: { type: 'multi_select', multi_select: [{ name: 'Bio' }] },
            },
          },
        ],
        hasMore: true,
        totalRowCount: 42,
      }),
    });

    const useCase = new GetDatabasePreviewUseCase(api as never);
    const result = await useCase.execute('abc', 'owner-1');

    expect(api.queryDatabasePreview).toHaveBeenCalledWith('abc', 10);
    expect(result.title).toBe('Vocabulary');
    expect(result.url).toBe('https://notion.so/abc');
    expect(result.columns).toEqual(['Word', 'Definition', 'Tags']);
    expect(result.mapping).toEqual({
      frontField: 'Word',
      backField: 'Definition',
      ambiguous: false,
    });
    expect(result.samples).toHaveLength(2);
    expect(result.samples[0]).toEqual({
      Word: 'Osmosis',
      Definition: 'Movement of water',
      Tags: 'Bio',
    });
    expect(result.rowCount).toBe(2);
    expect(result.totalRowCount).toBe(42);
  });

  it('flags ambiguous mapping when no candidate columns match', async () => {
    const api = fakeApi({
      queryDatabasePreview: jest.fn().mockResolvedValue({
        results: [
          {
            properties: {
              Name: titleProp('Anything'),
              Notes: richTextProp('Anything else'),
            },
          },
        ],
        hasMore: false,
        totalRowCount: 1,
      }),
    });

    const useCase = new GetDatabasePreviewUseCase(api as never);
    const result = await useCase.execute('abc', 'owner-1');

    expect(result.mapping.ambiguous).toBe(true);
    expect(result.columns).toEqual(['Name', 'Notes']);
  });

  it('returns empty preview when the database has no rows', async () => {
    const api = fakeApi({
      queryDatabasePreview: jest.fn().mockResolvedValue({
        results: [],
        hasMore: false,
        totalRowCount: 0,
      }),
    });

    const useCase = new GetDatabasePreviewUseCase(api as never);
    const result = await useCase.execute('abc', 'owner-1');

    expect(result.columns).toEqual([]);
    expect(result.samples).toEqual([]);
    expect(result.rowCount).toBe(0);
    expect(result.totalRowCount).toBe(0);
    expect(result.mapping).toEqual({
      frontField: null,
      backField: null,
      ambiguous: true,
    });
  });

  it('truncates samples to the preview cap and reports totalRowCount when has_more', async () => {
    const rows: QueryRow[] = Array.from({ length: 10 }, (_, i) => ({
      properties: { Word: titleProp(`Term ${i}`), Definition: richTextProp(`Def ${i}`) },
    }));
    const api = fakeApi({
      queryDatabasePreview: jest.fn().mockResolvedValue({
        results: rows,
        hasMore: true,
        totalRowCount: 200,
      }),
    });

    const useCase = new GetDatabasePreviewUseCase(api as never);
    const result = await useCase.execute('abc', 'owner-1');

    expect(result.rowCount).toBe(10);
    expect(result.totalRowCount).toBe(200);
    expect(result.samples).toHaveLength(10);
  });
});
