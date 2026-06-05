import { randomUUID } from 'node:crypto';
import { isFullBlock } from '@notionhq/client';
import { ImageBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import NotionAPIWrapper from '../../services/NotionService/NotionAPIWrapper';
import { getImageUrl } from '../../services/NotionService/helpers/getImageUrl';
import { isValidNotionId } from '../../services/NotionService/isValidNotionId';
import StorageHandler from '../../lib/storage/StorageHandler';
import instrumentedAxios from '../../services/observability/instrumentedAxios';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const SIZE_CAP = 10 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export interface NotionImageResult {
  s3Key: string;
  presignedUrl: string;
}

export class ImportNotionImagesUseCase {
  constructor(private readonly storage: StorageHandler) {}

  async execute(
    blockIds: string[],
    userId: string,
    token: string | null
  ): Promise<NotionImageResult[]> {
    if (token == null) {
      throw Object.assign(new Error('Notion connection required.'), {
        status: 401,
      });
    }

    for (const id of blockIds) {
      if (!isValidNotionId(id)) {
        throw Object.assign(new Error(`Invalid block ID: ${id}`), {
          status: 400,
        });
      }
    }

    const api = new NotionAPIWrapper(token, userId);
    const results: NotionImageResult[] = [];

    for (const blockId of blockIds) {
      const block = await api.getBlock(blockId);
      if (!isFullBlock(block) || block.type !== 'image') continue;
      const url = getImageUrl(block as ImageBlockObjectResponse);
      if (url == null) continue;

      const response = await instrumentedAxios.get<ArrayBuffer>('notion', url, {
        responseType: 'arraybuffer',
        maxContentLength: SIZE_CAP,
      });

      const contentType = String(response.headers['content-type'] ?? '')
        .split(';')[0]
        .trim();
      if (!ALLOWED_MIMES.has(contentType)) continue;

      const buf = Buffer.from(response.data as ArrayBuffer);
      if (buf.length > SIZE_CAP) continue;

      const ext = MIME_EXT[contentType] ?? '.jpg';
      const s3Key = `io-drafts/${userId}/${randomUUID()}${ext}`;

      await this.storage.uploadFile(s3Key, buf);
      results.push({
        s3Key,
        presignedUrl: await this.storage.getPresignedUrl(s3Key),
      });
    }

    return results;
  }
}
