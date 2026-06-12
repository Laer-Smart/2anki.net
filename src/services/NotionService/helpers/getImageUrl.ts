import { ImageBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { isFullBlock } from '@notionhq/client';

import { MediaSourceType } from './downloadWithFreshUrlRetry';

export const getImageUrl = (block: ImageBlockObjectResponse): string | null => {
  if (!isFullBlock(block)) {
    return null;
  }
  switch (block.image.type) {
    case 'external':
      return block.image.external.url;
    case 'file':
      return block.image.file.url;
    default:
      return null;
  }
};

export const getImageSourceType = (
  block: ImageBlockObjectResponse
): MediaSourceType => (block.image.type === 'file' ? 'file' : 'external');
