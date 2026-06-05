import { isFullBlock } from '@notionhq/client';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { getHeadingText } from '../../helpers/getHeadingText';

export type HeadingClassifier = (block: GetBlockResponse) => boolean;

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

const headingSegment = (block: GetBlockResponse): string => {
  if (!isFullBlock(block)) {
    return '';
  }
  const text = getHeadingText(block)
    ?.map((t) => t.plain_text)
    .join('')
    .trim();
  if (!text) {
    return '';
  }
  return text.replace(/\s+/g, '-');
};

const chainOf = (context: (string | undefined)[]): string =>
  context.filter((segment): segment is string => Boolean(segment)).join('::');

export const buildHeadingTagMap = (
  blocks: GetBlockResponse[],
  isCard: HeadingClassifier
): Map<string, string> => {
  const map = new Map<string, string>();
  const context: (string | undefined)[] = [undefined, undefined, undefined];

  for (const block of blocks) {
    if (!isFullBlock(block)) {
      continue;
    }

    if (isCard(block)) {
      const chain = chainOf(context);
      if (chain) {
        map.set(block.id, chain);
      }
    }

    const level = headingLevelOf(block);
    if (level === undefined) {
      continue;
    }

    context[level - 1] = headingSegment(block) || undefined;
    for (let deeper = level; deeper < context.length; deeper += 1) {
      context[deeper] = undefined;
    }
  }

  return map;
};
