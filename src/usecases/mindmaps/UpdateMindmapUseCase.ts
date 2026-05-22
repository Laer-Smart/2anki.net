import { hasAnkifyAccess, AnkifyAccessUser, AnkifyAccessSubscription } from '../../lib/ankify/access';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId } from '../../data_layer/public/Mindmaps';
import { MindmapData } from './MindmapData';
import { UsersId } from '../../data_layer/public/Users';

import { MindmapLimitError } from './CreateMindmapUseCase';

export { MindmapLimitError };

export const FREE_NODE_LIMIT = 50;

interface UpdateInput {
  id: MindmapsId;
  userId: UsersId;
  title?: string;
  data?: MindmapData;
  user: AnkifyAccessUser;
  subscriptions: AnkifyAccessSubscription[];
  autoSyncProductId?: string;
}

export class UpdateMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  async execute(input: UpdateInput): Promise<Mindmaps | null> {
    const { id, userId, title, data, user, subscriptions, autoSyncProductId = '' } = input;
    const isUnlimited = hasAnkifyAccess(user, subscriptions, autoSyncProductId);

    if (!isUnlimited && data != null && data.nodes.length > FREE_NODE_LIMIT) {
      throw new MindmapLimitError(FREE_NODE_LIMIT);
    }

    const patch: Partial<Pick<Mindmaps, 'title' | 'data'>> = {};
    if (title != null) patch.title = title;
    if (data != null) patch.data = data;

    return this.repo.update(id, userId, patch);
  }
}
