import { Request, Response } from 'express';

import { CreateMindmapUseCase, MindmapLimitError } from '../usecases/mindmaps/CreateMindmapUseCase';
import { UpdateMindmapUseCase } from '../usecases/mindmaps/UpdateMindmapUseCase';
import { DeleteMindmapUseCase } from '../usecases/mindmaps/DeleteMindmapUseCase';
import { ListMindmapsUseCase } from '../usecases/mindmaps/ListMindmapsUseCase';
import { GetMindmapUseCase } from '../usecases/mindmaps/GetMindmapUseCase';
import {
  ExportMindmapUseCase,
  MindmapNotFoundError,
} from '../usecases/mindmaps/ExportMindmapUseCase';
import { MindmapsId } from '../data_layer/public/Mindmaps';
import { UsersId } from '../data_layer/public/Users';
import { AnkifyAccessUser, AnkifyAccessSubscription } from '../lib/ankify/access';

export class MindmapController {
  constructor(
    private readonly createUseCase: CreateMindmapUseCase,
    private readonly updateUseCase: UpdateMindmapUseCase,
    private readonly deleteUseCase: DeleteMindmapUseCase,
    private readonly listUseCase: ListMindmapsUseCase,
    private readonly getUseCase: GetMindmapUseCase,
    private readonly exportUseCase: ExportMindmapUseCase
  ) {}

  private resolveUserContext(res: Response): {
    userId: UsersId;
    user: AnkifyAccessUser;
    subscriptions: AnkifyAccessSubscription[];
    autoSyncProductId: string;
  } {
    return {
      userId: res.locals.owner as UsersId,
      user: { patreon: (res.locals.patreon as boolean | null | undefined) ?? null },
      subscriptions:
        (res.locals.subscriptionInfo as AnkifyAccessSubscription[] | null) ?? [],
      autoSyncProductId: process.env.AUTO_SYNC_PRODUCT_ID ?? '',
    };
  }

  async list(_req: Request, res: Response) {
    const { userId, user, subscriptions, autoSyncProductId } =
      this.resolveUserContext(res);

    const result = await this.listUseCase.execute({
      userId,
      user,
      subscriptions,
      autoSyncProductId,
    });
    res.status(200).json(result);
  }

  async create(req: Request, res: Response) {
    const { userId, user, subscriptions, autoSyncProductId } =
      this.resolveUserContext(res);
    const rawTitle =
      typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const title = rawTitle.length > 0 ? rawTitle : 'Untitled';

    try {
      const map = await this.createUseCase.execute({
        userId,
        title,
        user,
        subscriptions,
        autoSyncProductId,
      });
      res.status(201).json(map);
    } catch (error) {
      if (error instanceof MindmapLimitError) {
        res.status(402).json({ message: error.message });
        return;
      }
      throw error;
    }
  }

  async getById(req: Request, res: Response) {
    const userId = res.locals.owner as UsersId;
    const id = req.params.id as MindmapsId;
    const map = await this.getUseCase.execute(id, userId);
    if (map == null) {
      res.status(404).json({ message: 'Mind map not found' });
      return;
    }
    res.status(200).json(map);
  }

  async update(req: Request, res: Response) {
    const { userId, user, subscriptions, autoSyncProductId } =
      this.resolveUserContext(res);
    const id = req.params.id as MindmapsId;
    const title =
      req.body?.title != null ? String(req.body.title).trim() : undefined;
    const data = req.body?.data ?? undefined;

    try {
      const map = await this.updateUseCase.execute({
        id,
        userId,
        title,
        data,
        user,
        subscriptions,
        autoSyncProductId,
      });
      if (map == null) {
        res.status(404).json({ message: 'Mind map not found' });
        return;
      }
      res.status(200).json(map);
    } catch (error) {
      if (error instanceof MindmapLimitError) {
        res.status(402).json({ message: error.message });
        return;
      }
      throw error;
    }
  }

  async remove(req: Request, res: Response) {
    const userId = res.locals.owner as UsersId;
    const id = req.params.id as MindmapsId;
    await this.deleteUseCase.execute(id, userId);
    res.status(204).send();
  }

  async exportDeck(req: Request, res: Response) {
    const userId = res.locals.owner as UsersId;
    const id = req.params.id as MindmapsId;
    const deckName =
      typeof req.body?.deck_name === 'string' &&
      req.body.deck_name.trim().length > 0
        ? req.body.deck_name.trim()
        : undefined;

    try {
      const buffer = await this.exportUseCase.execute({ id, userId, deckName });
      const fileName = `${(deckName ?? id).replace(/[^a-zA-Z0-9._-]/g, '_')}.apkg`;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );
      res.status(200).send(buffer);
    } catch (error) {
      if (error instanceof MindmapNotFoundError) {
        res.status(404).json({ message: 'Mind map not found' });
        return;
      }
      throw error;
    }
  }
}
