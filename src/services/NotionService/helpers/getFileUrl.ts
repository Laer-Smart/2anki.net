import {
  FileBlockObjectResponse,
  PdfBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { isFullBlock } from '@notionhq/client';

import { MediaSourceType } from './downloadWithFreshUrlRetry';

export const getFileUrl = (
  block: FileBlockObjectResponse | PdfBlockObjectResponse
): string | null => {
  if (!isFullBlock(block)) {
    return null;
  }
  const source = block.type === 'pdf' ? block.pdf : block.file;
  switch (source.type) {
    case 'external':
      return source.external.url;
    case 'file':
      return source.file.url;
    default:
      return null;
  }
};

export const getFileSourceType = (
  block: FileBlockObjectResponse | PdfBlockObjectResponse
): MediaSourceType => {
  const source = block.type === 'pdf' ? block.pdf : block.file;
  return source.type === 'file' ? 'file' : 'external';
};
