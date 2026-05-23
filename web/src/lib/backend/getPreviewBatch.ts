import { get } from './api';

export type BlockDecision = 'card' | 'skip' | 'recurse';

export interface PreviewBlock {
  id: string;
  type: string;
  hasChildren: boolean;
  canExpand: boolean;
  html: string;
  summaryHtml?: string;
  decision?: BlockDecision;
  childPageId?: string;
  childPageTitle?: string;
}

export interface PreviewBatch {
  blocks: PreviewBlock[];
  nextCursor: string | null;
  hasMore: boolean;
  pageTitle?: string;
  pageUrl?: string | null;
}

interface PreviewBatchOptions {
  parentKind?: 'page' | 'block';
}

export const getPreviewBatch = async (
  pageId: string,
  cursor?: string | null,
  options: PreviewBatchOptions = {}
): Promise<PreviewBatch> => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (options.parentKind) params.set('parent', options.parentKind);
  const qs = params.toString();
  const url = `/api/notion/preview/${encodeURIComponent(pageId)}${
    qs ? `?${qs}` : ''
  }`;
  const data = await get(url);
  return data as PreviewBatch;
};
