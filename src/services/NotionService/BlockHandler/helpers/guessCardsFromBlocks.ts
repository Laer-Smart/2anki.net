import { isFullBlock } from '@notionhq/client';
import {
  GetBlockResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import Note from '../../../../lib/parser/Note';
import { guessMarkdownCards } from '../../../../lib/parser/guessMarkdownCards';

const HEADING_TYPES = new Set(['heading_1', 'heading_2', 'heading_3']);

function richTextToPlain(richText: RichTextItemResponse[]): string {
  return richText
    .map((item) => item.plain_text ?? '')
    .join('')
    .trim();
}

function blockRichText(block: GetBlockResponse): RichTextItemResponse[] | null {
  if (!isFullBlock(block)) {
    return null;
  }
  const content = (block as Record<string, unknown>)[block.type];
  if (content == null || typeof content !== 'object') {
    return null;
  }
  const richText = (content as { rich_text?: unknown }).rich_text;
  if (!Array.isArray(richText)) {
    return null;
  }
  return richText as RichTextItemResponse[];
}

function blockToMarkdownLine(block: GetBlockResponse): string | null {
  const richText = blockRichText(block);
  if (richText == null) {
    return null;
  }
  const text = richTextToPlain(richText);
  if (!text) {
    return null;
  }
  if (isFullBlock(block) && HEADING_TYPES.has(block.type)) {
    return `## ${text}`;
  }
  return text;
}

/**
 * Toggle-less fallback for the live-Notion path. When a page produces zero
 * toggle-shaped cards, flatten its walked blocks into a plain-text markdown
 * document and reuse the upload path's guessMarkdownCards heuristic
 * (heading+content, Q:/A:, term::definition) so the two conversion paths make
 * the same cards for equivalent content. Returns [] when nothing matches, so
 * the caller falls through to the existing empty-deck message.
 */
export function guessCardsFromBlocks(blocks: GetBlockResponse[]): Note[] {
  const lines: string[] = [];
  for (const block of blocks) {
    const line = blockToMarkdownLine(block);
    if (line != null) {
      lines.push(line);
    }
  }
  if (lines.length === 0) {
    return [];
  }
  const result = guessMarkdownCards(lines.join('\n\n'));
  return result?.notes ?? [];
}
