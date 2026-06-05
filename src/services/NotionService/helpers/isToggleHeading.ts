import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { isFullBlock } from '@notionhq/client';

/**
 * Notion headings can be toggled by the user (is_toggleable). When enabled,
 * they behave like a toggle block — the heading is the summary and the
 * children are revealed/hidden. Treat those as toggles for flashcard
 * purposes so users don't need to enable heading_* in their rules just to
 * convert toggle-headings.
 */
export function isToggleHeading(block: BlockObjectResponse): boolean {
  if (!isFullBlock(block)) {
    return false;
  }
  switch (block.type) {
    case 'heading_1':
      return block.heading_1.is_toggleable === true;
    case 'heading_2':
      return block.heading_2.is_toggleable === true;
    case 'heading_3':
      return block.heading_3.is_toggleable === true;
    case 'heading_4':
      return block.heading_4.is_toggleable === true;
    default:
      return false;
  }
}
