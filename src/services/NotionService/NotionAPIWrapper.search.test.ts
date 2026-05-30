import NotionAPIWrapper from './NotionAPIWrapper';

const PAGE = (id: string, title: string) => ({
  object: 'page',
  id,
  url: `https://www.notion.so/${id}`,
  parent: { type: 'page_id', page_id: 'ccna-200-301' },
  properties: {
    title: { id: 'title', type: 'title', title: [{ plain_text: title }] },
  },
});

const installSearchStub = (
  wrapper: NotionAPIWrapper,
  pages: ReadonlyArray<{ results: unknown[]; next_cursor: string | null }>
) => {
  let call = 0;
  const search = jest.fn(async () => {
    const page = pages[call] ?? { results: [], next_cursor: null };
    call += 1;
    return {
      object: 'list',
      type: 'page_or_database',
      results: page.results,
      has_more: page.next_cursor != null,
      next_cursor: page.next_cursor,
    };
  });
  (wrapper as unknown as { notion: { search: unknown } }).notion = {
    search,
  } as unknown as NotionAPIWrapper['notion' & keyof NotionAPIWrapper];
  return search;
};

describe('NotionAPIWrapper.search', () => {
  test('aggregates matches across paginated Notion search responses', async () => {
    const wrapper = new NotionAPIWrapper('test-token', '1');
    const search = installSearchStub(wrapper, [
      {
        results: [
          PAGE('s31', 'Section 31: WAN'),
          PAGE('boson', 'Boson: Network Fundamentals'),
          PAGE('s37', 'Section 37: Wireless Networking Fundamentals'),
        ],
        next_cursor: 'cursor-page-2',
      },
      {
        results: [
          PAGE('s38', 'Section 38: Network Automation and Programmability'),
        ],
        next_cursor: null,
      },
    ]);

    const result = await wrapper.search('Network automation');

    expect(search).toHaveBeenCalledTimes(2);
    const ids = result.results.map((r) => (r as { id: string }).id);
    expect(ids).toContain('s38');
    expect(ids).toEqual(['s31', 'boson', 's37', 's38']);
  });

  test('stops paginating when Notion reports no more pages', async () => {
    const wrapper = new NotionAPIWrapper('test-token', '1');
    const search = installSearchStub(wrapper, [
      {
        results: [PAGE('only', 'Only page')],
        next_cursor: null,
      },
    ]);

    const result = await wrapper.search('Only');

    expect(search).toHaveBeenCalledTimes(1);
    expect(result.results.map((r) => (r as { id: string }).id)).toEqual([
      'only',
    ]);
  });

  test('caps pagination so a noisy workspace cannot loop unbounded', async () => {
    const wrapper = new NotionAPIWrapper('test-token', '1');
    const search = installSearchStub(
      wrapper,
      Array.from({ length: 30 }, (_, i) => ({
        results: [PAGE(`p${i}`, `Page ${i}`)],
        next_cursor: `cursor-${i}`,
      }))
    );

    await wrapper.search('Page');

    expect(search.mock.calls.length).toBeLessThanOrEqual(20);
  });
});
