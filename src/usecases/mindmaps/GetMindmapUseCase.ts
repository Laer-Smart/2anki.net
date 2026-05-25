import StorageHandler from '../../lib/storage/StorageHandler';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';
import { MindmapData, MindmapImageMeta } from './MindmapData';

const LEGACY_PREFIX = '/api/mindmaps/images/';
const S3_KEY_PREFIX = 'mindmaps/';

function isLegacyUrl(value: string): boolean {
  return value.startsWith(LEGACY_PREFIX);
}

function isS3Key(value: string): boolean {
  return value.startsWith(S3_KEY_PREFIX);
}

async function resolveImage(
  image: MindmapImageMeta,
  storage: StorageHandler,
  userId: UsersId,
  mapId: MindmapsId
): Promise<MindmapImageMeta> {
  const { url } = image;
  if (url == null) {
    return { ...image, missing: true, url: null };
  }
  if (isLegacyUrl(url)) {
    return { url: null, width: image.width, height: image.height, missing: true };
  }
  if (isS3Key(url)) {
    const expectedPrefix = `${S3_KEY_PREFIX}${userId}/${mapId}/`;
    if (!url.startsWith(expectedPrefix)) {
      return { url: null, width: image.width, height: image.height, missing: true };
    }
    const presignedUrl = await storage.getPresignedUrl(url).catch(() => null);
    if (presignedUrl == null) {
      return { url: null, width: image.width, height: image.height, missing: true };
    }
    return { ...image, url: presignedUrl };
  }
  return { ...image, missing: true, url: null };
}

export class GetMindmapUseCase {
  constructor(
    private readonly repo: MindmapRepositoryInterface,
    private readonly storage: StorageHandler
  ) {}

  async execute(id: MindmapsId, userId: UsersId): Promise<Mindmaps | null> {
    const map = await this.repo.findById(id, userId);
    if (map == null) return null;

    const data = map.data as MindmapData;
    const resolvedNodes = await Promise.all(
      data.nodes.map(async (node) => {
        if (node.image == null) return node;
        const resolvedImage = await resolveImage(node.image, this.storage, userId, id);
        return { ...node, image: resolvedImage };
      })
    );

    return { ...map, data: { ...data, nodes: resolvedNodes } };
  }
}
