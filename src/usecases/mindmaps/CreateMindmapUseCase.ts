import {
  hasAnkifyAccess,
  AnkifyAccessUser,
  AnkifyAccessSubscription,
} from '../../lib/ankify/access';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

export const FREE_MAP_LIMIT = 3;

export class MindmapLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`Mind map limit reached (${limit})`);
    this.name = 'MindmapLimitError';
  }
}

interface CreateInput {
  userId: UsersId;
  title: string;
  user: AnkifyAccessUser;
  subscriptions: AnkifyAccessSubscription[];
  autoSyncProductId?: string;
}

export class CreateMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  async execute(input: CreateInput): Promise<Mindmaps> {
    const {
      userId,
      title,
      user,
      subscriptions,
      autoSyncProductId = '',
    } = input;
    const isUnlimited = hasAnkifyAccess(user, subscriptions, autoSyncProductId);

    if (!isUnlimited) {
      const count = await this.repo.countByUserId(userId);
      if (count >= FREE_MAP_LIMIT) {
        throw new MindmapLimitError(FREE_MAP_LIMIT);
      }
    }

    const rootNode = { id: crypto.randomUUID(), label: title || 'Untitled' };
    return this.repo.create({
      user_id: userId,
      title,
      data: { nodes: [rootNode], edges: [] },
    });
  }
}
