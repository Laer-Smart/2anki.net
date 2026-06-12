import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';

import NotionAPIWrapper from '../NotionAPIWrapper';
import { downloadMediaOrSkip } from './downloadMediaOrSkip';

export type MediaSourceType = 'file' | 'external';

interface FreshUrlRetryParams {
  api: NotionAPIWrapper;
  blockId: string;
  url: string;
  sourceType: MediaSourceType;
  extractFreshUrl: (block: GetBlockResponse) => string | null;
}

async function resolveFreshUrl(
  api: NotionAPIWrapper,
  blockId: string,
  extractFreshUrl: (block: GetBlockResponse) => string | null
): Promise<string | null> {
  try {
    const freshBlock = await api.getBlock(blockId);
    return extractFreshUrl(freshBlock);
  } catch (error) {
    console.warn(
      `Could not re-fetch Notion block ${blockId} for a fresh media URL`,
      error
    );
    return null;
  }
}

export async function downloadWithFreshUrlRetry({
  api,
  blockId,
  url,
  sourceType,
  extractFreshUrl,
}: FreshUrlRetryParams): Promise<Buffer | null> {
  const contents = await downloadMediaOrSkip(url);
  if (contents != null || sourceType !== 'file') {
    return contents;
  }

  const freshUrl = await resolveFreshUrl(api, blockId, extractFreshUrl);
  if (freshUrl == null) {
    return null;
  }

  return downloadMediaOrSkip(freshUrl);
}
