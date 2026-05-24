import { Request, Response } from 'express';

import { getDatabase } from '../data_layer';
import { FavoritesRepository } from '../data_layer/FavoritesRepository';
import NotionRepository from '../data_layer/NotionRespository';
import BlocksCacheRepository from '../data_layer/BlocksCacheRepository';
import sendErrorResponse from '../lib/sendErrorResponse';
import FavoriteService from '../services/FavoriteService';
import NotionService from '../services/NotionService';
import GetEnrichedFavoritesByOwnerUseCase from '../usecases/favorites/GetEnrichedFavoritesByOwnerUseCase';
import { getReturnStatusCodeFromBoolean } from './helpers/getReturnStatusCodeFromBoolean';

class FavoritesController {
  constructor(private service: FavoriteService) {}

  async createFavorite(req: Request, res: Response) {
    try {
      const { id, type } = req.body;
      const { owner } = res.locals;
      const didCreate = await this.service.create({
        object_id: id,
        owner,
        type,
      });
      res.status(getReturnStatusCodeFromBoolean(didCreate)).send();
    } catch (error) {
      sendErrorResponse(error, res);
    }
  }

  async deleteFavorite(req: Request, res: Response) {
    try {
      const { owner } = res.locals;
      const { id } = req.body;
      const didDelete = await this.service.delete(id, owner);

      res.status(getReturnStatusCodeFromBoolean(didDelete)).send();
    } catch (error) {
      sendErrorResponse(error, res);
    }
  }

  async getFavorites(_req: Request, res: Response) {
    const { owner } = res.locals;

    try {
      const database = getDatabase();
      const notionService = new NotionService(
        new NotionRepository(database),
        undefined,
        new BlocksCacheRepository(database)
      );
      const useCase = new GetEnrichedFavoritesByOwnerUseCase(
        new FavoritesRepository(database),
        (ownerId) => notionService.tryGetNotionAPI(ownerId)
      );
      const favorites = await useCase.execute(owner);
      res.json(favorites);
    } catch (error) {
      console.error(error);
      res.json([]);
    }
  }
}

export default FavoritesController;
