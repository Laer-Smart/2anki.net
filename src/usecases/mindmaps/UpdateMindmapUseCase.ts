import { hasAnkifyAccess, AnkifyAccessUser, AnkifyAccessSubscription } from '../../lib/ankify/access';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId } from '../../data_layer/public/Mindmaps';
import { MindmapData, MindmapImageMeta } from './MindmapData';
import { UsersId } from '../../data_layer/public/Users';

import { MindmapLimitError } from './CreateMindmapUseCase';

export { MindmapLimitError };

export const FREE_NODE_LIMIT = 50;

const LEGACY_PREFIX = '/api/mindmaps/images/';
const S3_KEY_PREFIX = 'mindmaps/';

function sanitizeImageUrl(image: MindmapImageMeta): MindmapImageMeta {
  const { url } = image;
  if (url == null) {
    return { ...image, missing: true, url: null };
  }
  if (url.startsWith(LEGACY_PREFIX)) {
    return { url: null, width: image.width, height: image.height, missing: true };
  }
  if (url.startsWith(S3_KEY_PREFIX)) {
    return { ...image, url };
  }
  const s3KeyMatch = url.match(/[?#]/);
  const rawPath = s3KeyMatch != null ? url.slice(0, s3KeyMatch.index) : url;
  const keyStart = rawPath.indexOf(S3_KEY_PREFIX);
  if (keyStart !== -1) {
    return { ...image, url: rawPath.slice(keyStart) };
  }
  return { url: null, width: image.width, height: image.height, missing: true };
}

function sanitizeData(data: MindmapData): MindmapData {
  return {
    ...data,
    nodes: data.nodes.map((node) => {
      if (node.image == null) return node;
      return { ...node, image: sanitizeImageUrl(node.image) };
    }),
  };
}

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
    if (data != null) patch.data = sanitizeData(data);

    return this.repo.update(id, userId, patch);
  }
}
