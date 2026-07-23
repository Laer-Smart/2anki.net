import ListPublicSharesUseCase from './ListPublicSharesUseCase';

function makeShareService(overrides: Record<string, unknown> = {}) {
  return {
    listPublicShares: jest.fn().mockResolvedValue([]),
    buildShareUrl: jest.fn((token: string) => `https://2anki.net/s/${token}`),
    ...overrides,
  };
}

describe('ListPublicSharesUseCase', () => {
  it('maps public shares to the listing shape, one page beyond page size', async () => {
    const rows = [
      {
        token: 't1',
        title: 'Deck one',
        card_count: 10,
        created_at: new Date('2026-07-01'),
        view_count: 3,
      },
      {
        token: 't2',
        title: 'Deck two',
        card_count: 5,
        created_at: new Date('2026-07-02'),
        view_count: 1,
      },
    ];
    const shareService = makeShareService({
      listPublicShares: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new ListPublicSharesUseCase(shareService as any);

    const result = await useCase.execute(0, 20);

    expect(shareService.listPublicShares).toHaveBeenCalledWith(0, 21);
    expect(result.decks).toEqual([
      {
        token: 't1',
        title: 'Deck one',
        card_count: 10,
        created_at: rows[0].created_at,
        view_count: 3,
        url: 'https://2anki.net/s/t1',
      },
      {
        token: 't2',
        title: 'Deck two',
        card_count: 5,
        created_at: rows[1].created_at,
        view_count: 1,
        url: 'https://2anki.net/s/t2',
      },
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it('returns a next cursor when there is another page', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      token: `t${i}`,
      title: `Deck ${i}`,
      card_count: 5,
      created_at: new Date(),
      view_count: 0,
    }));
    const shareService = makeShareService({
      listPublicShares: jest.fn().mockResolvedValue(rows),
    });
    const useCase = new ListPublicSharesUseCase(shareService as any);

    const result = await useCase.execute(0, 2);

    expect(result.decks).toHaveLength(2);
    expect(result.nextCursor).toBe(2);
  });
});
