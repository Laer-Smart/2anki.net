import {
  FileBlockObjectResponse,
  PdfBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { isFullBlock } from '@notionhq/client';

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
      return 'unsupported file: ' + JSON.stringify(block);
  }
};
