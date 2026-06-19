import { isFullBlock } from '@notionhq/client';
import {
  BlockObjectResponse,
  GetBlockResponse,
  PartialBlockObjectResponse,
  SyncedBlockBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import NotionAPIWrapper from '../NotionAPIWrapper';

type AnyBlock = GetBlockResponse | PartialBlockObjectResponse;

const MAX_DEPTH = 8;

function getSourceId(block: SyncedBlockBlockObjectResponse): string {
  const syncedFrom = block.synced_block.synced_from;
  if (syncedFrom != null && typeof syncedFrom.block_id === 'string') {
    return syncedFrom.block_id;
  }
  return block.id;
}

function isSyncedBlock(
  block: AnyBlock
): block is SyncedBlockBlockObjectResponse {
  return (
    isFullBlock(block) && (block as BlockObjectResponse).type === 'synced_block'
  );
}

async function resolveSyncedBlockChildren(
  block: SyncedBlockBlockObjectResponse,
  api: NotionAPIWrapper,
  useAll: boolean,
  seen: Set<string>,
  depth: number
): Promise<AnyBlock[]> {
  if (depth > MAX_DEPTH) {
    return [];
  }
  const sourceId = getSourceId(block);
  if (seen.has(sourceId)) {
    return [];
  }
  seen.add(sourceId);
  try {
    const response = await api.getBlocks({
      createdAt: block.created_time,
      lastEditedAt: block.last_edited_time,
      id: sourceId,
      all: useAll,
      type: 'synced_block',
    });
    return await expandInternal(response.results, api, useAll, seen, depth + 1);
  } catch (e: unknown) {
    // Expected when the user hasn't shared the synced block's source with the
    // integration — we recover by returning no children, not an error.
    console.warn('[notion] failed to resolve synced_block source', e);
    return [];
  }
}

async function expandInternal(
  blocks: AnyBlock[],
  api: NotionAPIWrapper,
  useAll: boolean,
  seen: Set<string>,
  depth: number
): Promise<AnyBlock[]> {
  const expanded: AnyBlock[] = [];
  for (const block of blocks) {
    if (!isSyncedBlock(block)) {
      expanded.push(block);
      continue;
    }
    const children = await resolveSyncedBlockChildren(
      block,
      api,
      useAll,
      seen,
      depth
    );
    expanded.push(...children);
  }
  return expanded;
}

export async function expandSyncedBlocks(
  blocks: AnyBlock[],
  api: NotionAPIWrapper,
  useAll: boolean
): Promise<AnyBlock[]> {
  return expandInternal(blocks, api, useAll, new Set<string>(), 0);
}
