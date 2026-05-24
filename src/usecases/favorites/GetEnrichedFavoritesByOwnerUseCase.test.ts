import { APIResponseError } from '@notionhq/client';

import { FavoritesRepository } from '../../data_layer/FavoritesRepository';
import Favorites from '../../data_layer/public/Favorites';
import GetEnrichedFavoritesByOwnerUseCase, {
  FavoriteEnrichmentClient,
} from './GetEnrichedFavoritesByOwnerUseCase';

const OWNER = 'user-42';

function makeRepository(favorites: Favorites[]): {
  repo: FavoritesRepository;
  removed: Array<{ id: string; owner: string | number }>;
} {
  const removed: Array<{ id: string; owner: string | number }> = [];
  const byId = new Map(favorites.map((f) => [f.object_id, f]));
  const repo = {
    table: 'favorites',
    getAllByOwner: jest
      .fn<Promise<Favorites[]>, [string]>()
      .mockResolvedValue(favorites),
    findById: jest.fn(async (id: string) => byId.get(id) as Favorites),
    remove: jest.fn(
      async (id: string, owner: string | number): Promise<void> => {
        removed.push({ id, owner });
      }
    ),
  } as unknown as FavoritesRepository;
  return { repo, removed };
}

function makeFavorite(
  object_id: string,
  type: 'page' | 'database'
): Favorites {
  return { object_id, owner: OWNER, type } as unknown as Favorites;
}

function makeApiResponseError(status: number): APIResponseError {
  // APIResponseError's real constructor wants the full Notion response;
  // we only need the prototype chain so `instanceof` checks succeed.
  const err = Object.create(APIResponseError.prototype) as APIResponseError;
  Object.assign(err, {
    name: 'APIResponseError',
    message: `HTTP ${status}`,
    code: 'object_not_found',
    status,
  });
  return err;
}

describe('GetEnrichedFavoritesByOwnerUseCase', () => {
  it('returns [] when owner is empty', async () => {
    const { repo } = makeRepository([]);
    const useCase = new GetEnrichedFavoritesByOwnerUseCase(
      repo,
      async () => ({ getPage: jest.fn(), getDatabase: jest.fn() })
    );
    expect(await useCase.execute('')).toEqual([]);
    expect(repo.getAllByOwner).not.toHaveBeenCalled();
  });

  it('returns [] when the enrichment client factory yields null', async () => {
    const { repo } = makeRepository([makeFavorite('p1', 'page')]);
    const useCase = new GetEnrichedFavoritesByOwnerUseCase(
      repo,
      async () => null
    );
    expect(await useCase.execute(OWNER)).toEqual([]);
  });

  it('enriches pages and databases using the right API method', async () => {
    const favorites = [
      makeFavorite('page-1', 'page'),
      makeFavorite('db-1', 'database'),
    ];
    const { repo } = makeRepository(favorites);
    const client: FavoriteEnrichmentClient = {
      getPage: jest
        .fn()
        .mockResolvedValue({ id: 'page-1', kind: 'page' }),
      getDatabase: jest
        .fn()
        .mockResolvedValue({ id: 'db-1', kind: 'database' }),
    };
    const useCase = new GetEnrichedFavoritesByOwnerUseCase(
      repo,
      async () => client
    );

    const result = await useCase.execute(OWNER);

    expect(client.getPage).toHaveBeenCalledWith('page-1');
    expect(client.getDatabase).toHaveBeenCalledWith('db-1');
    expect(result).toEqual([
      { id: 'page-1', kind: 'page' },
      { id: 'db-1', kind: 'database' },
    ]);
  });

  it('triggers cleanup on a 404 and yields undefined for that slot', async () => {
    const favorites = [
      makeFavorite('still-here', 'page'),
      makeFavorite('gone', 'page'),
    ];
    const { repo, removed } = makeRepository(favorites);
    const client: FavoriteEnrichmentClient = {
      getPage: jest
        .fn()
        .mockImplementation(async (id: string) => {
          if (id === 'gone') throw makeApiResponseError(404);
          return { id };
        }),
      getDatabase: jest.fn(),
    };
    const useCase = new GetEnrichedFavoritesByOwnerUseCase(
      repo,
      async () => client
    );

    const result = await useCase.execute(OWNER);

    expect(result).toEqual([{ id: 'still-here' }, undefined]);
    // cleanup is fire-and-forget — flush the microtask queue.
    await new Promise((resolve) => setImmediate(resolve));
    expect(removed).toEqual([{ id: 'gone', owner: OWNER }]);
  });

  it('swallows non-APIResponseError failures without cleanup', async () => {
    const { repo, removed } = makeRepository([makeFavorite('p1', 'page')]);
    const client: FavoriteEnrichmentClient = {
      getPage: jest.fn().mockRejectedValue(new Error('network down')),
      getDatabase: jest.fn(),
    };
    const useCase = new GetEnrichedFavoritesByOwnerUseCase(
      repo,
      async () => client
    );

    // suppress the expected error log so it doesn't pollute test output
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await useCase.execute(OWNER);
      expect(result).toEqual([undefined]);
      expect(removed).toEqual([]);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });
});
