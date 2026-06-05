import { isFullBlock } from '@notionhq/client';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { getHeadingText } from '../../helpers/getHeadingText';

export type HeadingClassifier = (block: GetBlockResponse) => boolean;

export interface HeadingContext {
  h1?: string;
  h2?: string;
  h3?: string;
}

const HEADING_LEVELS: Record<string, number> = {
  heading_1: 1,
  heading_2: 2,
  heading_3: 3,
};

const headingLevelOf = (block: GetBlockResponse): number | undefined => {
  if (!isFullBlock(block)) {
    return undefined;
  }
  return HEADING_LEVELS[block.type];
};

const headingTitle = (block: GetBlockResponse): string => {
  if (!isFullBlock(block)) {
    return '';
  }
  return (
    getHeadingText(block)
      ?.map((t) => t.plain_text)
      .join('')
      .trim() ?? ''
  );
};

export const buildHeadingContextMap = (
  blocks: GetBlockResponse[],
  isCard: HeadingClassifier
): Map<string, HeadingContext> => {
  const map = new Map<string, HeadingContext>();
  const context: (string | undefined)[] = [undefined, undefined, undefined];

  for (const block of blocks) {
    if (!isFullBlock(block)) {
      continue;
    }

    if (isCard(block)) {
      map.set(block.id, { h1: context[0], h2: context[1], h3: context[2] });
    }

    const level = headingLevelOf(block);
    if (level === undefined) {
      continue;
    }

    context[level - 1] = headingTitle(block) || undefined;
    for (let deeper = level; deeper < context.length; deeper += 1) {
      context[deeper] = undefined;
    }
  }

  return map;
};

const tagSegment = (title: string): string => title.replace(/\s+/g, '-');

export const buildHeadingTagMap = (
  blocks: GetBlockResponse[],
  isCard: HeadingClassifier
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const [blockId, context] of buildHeadingContextMap(blocks, isCard)) {
    const chain = [context.h1, context.h2, context.h3]
      .filter((title): title is string => Boolean(title))
      .map(tagSegment)
      .join('::');
    if (chain) {
      map.set(blockId, chain);
    }
  }
  return map;
};
