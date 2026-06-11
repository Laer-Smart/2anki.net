import { APIResponseError } from '@notionhq/client';

import { FavoritesRepository } from '../../data_layer/FavoritesRepository';
import Favorites from '../../data_layer/public/Favorites';
import DeleteFavoriteUseCase from './DeleteFavoriteUseCase';
import GetAllFavoritesByOwnerUseCase from './GetAllFavoritesByOwnerUseCase';
import { isNotionDatabaseNotPageError } from '../../services/NotionService/helpers/isNotionDatabaseNotPageError';

/**
 * Structural slice of `NotionAPIWrapper` that we depend on for enrichment.
 * Defining it here lets tests inject a fake without dragging in the whole
 * Notion client.
 */
export interface FavoriteEnrichmentClient {
  getPage(id: string): Promise<unknown>;
  getDatabase(id: string): Promise<unknown>;
}

export type FavoriteEnrichmentClientFactory = (
  owner: string
) => Promise<FavoriteEnrichmentClient | null | undefined>;

class GetEnrichedFavoritesByOwnerUseCase {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly enrichmentClientFactory: FavoriteEnrichmentClientFactory
  ) {}

  async execute(owner: string): Promise<unknown[]> {
    if (!owner) return [];

    const list = new GetAllFavoritesByOwnerUseCase(this.favoritesRepository);
    const favorites = await list.execute(owner);

    const client = await this.enrichmentClientFactory(owner);
    if (!client) return [];

    return Promise.all(
      favorites.map((favorite: Favorites) =>
        this.enrichOne(client, favorite, owner)
      )
    );
  }

  private enrichOne(
    client: FavoriteEnrichmentClient,
    favorite: Favorites,
    owner: string
  ): Promise<unknown> {
    const fetcher =
      favorite.type === 'page'
        ? client.getPage(favorite.object_id)
        : client.getDatabase(favorite.object_id);

    return fetcher.catch((error: unknown) => {
      if (isNotionDatabaseNotPageError(error)) {
        return client.getDatabase(favorite.object_id).catch(() => undefined);
      }
      if (error instanceof APIResponseError) {
        void this.cleanupStale(favorite.object_id, owner);
        return undefined;
      }
      console.error('[favorites] enrichment failed', {
        objectId: favorite.object_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    });
  }

  private async cleanupStale(objectId: string, owner: string): Promise<void> {
    try {
      const remove = new DeleteFavoriteUseCase(this.favoritesRepository);
      await remove.execute(objectId, owner);
    } catch (error: unknown) {
      console.error('[favorites] cleanup failed', {
        objectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default GetEnrichedFavoritesByOwnerUseCase;
