import {
  NotionRenderableBlock,
  WalkedMediaKind,
  WalkedNotionMediaRef,
  renderNotionBlocks,
} from '../../lib/notion-render';

interface RichTextItem {
  plain_text?: string;
}

interface NotionToggleBlock {
  id: string;
  type: 'toggle';
  last_edited_time: string;
  has_children: boolean;
  toggle: { rich_text: RichTextItem[] };
}

type NotionTopLevelBlock = NotionToggleBlock | { type: string; id?: string };

export type { WalkedMediaKind, WalkedNotionMediaRef };

export interface WalkedNotionFlashcard {
  notion_block_id: string;
  notion_last_edited_at: Date;
  front: string;
  back: string;
  media: WalkedNotionMediaRef[];
}

export interface SyncDiagnostic {
  blocks_scanned: number;
  blocks_matched: number;
  pattern_hits: Record<string, number>;
  unmatched_samples?: string[];
}

export interface WalkNotionPageResult {
  cards: WalkedNotionFlashcard[];
  diagnostic: SyncDiagnostic;
}

export type NotionBlockChildrenFetcher = (
  blockId: string
) => Promise<NotionRenderableBlock[]>;

const MAX_BLOCKS_SCANNED = 1000;
const MAX_UNMATCHED_SAMPLES = 3;

const renderRichText = (items: RichTextItem[] | undefined): string => {
  if (items == null) return '';
  return items
    .map((item) => item.plain_text ?? '')
    .join('')
    .trim();
};

const renderToggleBack = async (
  toggle: NotionToggleBlock,
  fetchChildren: NotionBlockChildrenFetcher
): Promise<{ back: string; media: WalkedNotionMediaRef[] }> => {
  if (!toggle.has_children) {
    return { back: '', media: [] };
  }
  const children = await fetchChildren(toggle.id);
  const rendered = await renderNotionBlocks(children, fetchChildren);
  return { back: rendered.html, media: rendered.media };
};

const extractBlockHeading = (block: NotionTopLevelBlock): string | null => {
  const b = block as Record<string, unknown>;
  const typeKey = b.type as string;
  const typeData = b[typeKey];
  if (typeData == null || typeof typeData !== 'object') return null;
  const richText = (typeData as Record<string, unknown>)['rich_text'];
  if (!Array.isArray(richText)) return null;
  const text = (richText as RichTextItem[])
    .map((item) => item.plain_text ?? '')
    .join('')
    .trim();
  return text.length > 0 ? text : null;
};

export const walkNotionPageForFlashcards = async (
  pageId: string,
  fetchChildren: NotionBlockChildrenFetcher
): Promise<WalkNotionPageResult> => {
  const topLevel = (await fetchChildren(pageId)) as NotionTopLevelBlock[];
  const cards: WalkedNotionFlashcard[] = [];
  const patternHits: Record<string, number> = {};
  const unmatchedSamples: string[] = [];

  const limit = Math.min(topLevel.length, MAX_BLOCKS_SCANNED);

  for (let i = 0; i < limit; i++) {
    const block = topLevel[i];
    if (block.type !== 'toggle') {
      if (unmatchedSamples.length < MAX_UNMATCHED_SAMPLES) {
        const heading = extractBlockHeading(block);
        if (heading != null) {
          unmatchedSamples.push(heading);
        }
      }
      continue;
    }
    const toggle = block as NotionToggleBlock;
    const front = renderRichText(toggle.toggle.rich_text);
    if (front.length === 0) {
      continue;
    }
    patternHits['toggle'] = (patternHits['toggle'] ?? 0) + 1;
    const { back, media } = await renderToggleBack(toggle, fetchChildren);
    cards.push({
      notion_block_id: toggle.id,
      notion_last_edited_at: new Date(toggle.last_edited_time),
      front,
      back,
      media,
    });
  }

  const diagnostic: SyncDiagnostic = {
    blocks_scanned: limit,
    blocks_matched: cards.length,
    pattern_hits: patternHits,
  };

  if (unmatchedSamples.length > 0) {
    diagnostic.unmatched_samples = unmatchedSamples;
  }

  return { cards, diagnostic };
};
