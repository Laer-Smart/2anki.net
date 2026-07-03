import {
  NotionRenderableBlock,
  NotionRichTextItem,
  WalkedMediaKind,
  WalkedNotionMediaRef,
  renderNotionBlocks,
  renderRichText,
} from '../../lib/notion-render';
import { wrapWithColorClass } from '../../lib/notion-render/richText';

type RichTextItem = NotionRichTextItem;

interface NotionToggleBlock {
  id: string;
  type: 'toggle';
  last_edited_time: string;
  has_children: boolean;
  toggle: { rich_text: RichTextItem[]; color?: string };
}

type NotionTopLevelBlock = NotionToggleBlock | { type: string; id?: string };

export type { WalkedMediaKind, WalkedNotionMediaRef };

export interface WalkedNotionFlashcard {
  notion_block_id: string;
  notion_last_edited_at: Date;
  front: string;
  back: string;
  media: WalkedNotionMediaRef[];
  /** Set only for cards walked out of a database child page. */
  notion_page_id?: string;
  notion_page_title?: string | null;
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
  unsupportedTypes: string[];
}

export type NotionBlockChildrenFetcher = (
  blockId: string
) => Promise<NotionRenderableBlock[]>;

export interface NotionDatabasePageRef {
  id: string;
  title?: string | null;
}

export type NotionDatabasePagesFetcher = (
  databaseId: string
) => Promise<NotionDatabasePageRef[]>;

const MAX_BLOCKS_SCANNED = 1000;
const MAX_UNMATCHED_SAMPLES = 3;
const MAX_DATABASE_PAGES = 250;

const renderToggleBack = async (
  toggle: NotionToggleBlock,
  fetchChildren: NotionBlockChildrenFetcher
): Promise<{
  back: string;
  media: WalkedNotionMediaRef[];
  unsupportedTypes: string[];
}> => {
  if (!toggle.has_children) {
    return { back: '', media: [], unsupportedTypes: [] };
  }
  const children = await fetchChildren(toggle.id);
  const rendered = await renderNotionBlocks(children, fetchChildren);
  return {
    back: rendered.html,
    media: rendered.media,
    unsupportedTypes: rendered.unsupportedTypes,
  };
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
  const unsupportedTypes: string[] = [];

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
    const frontText = toggle.toggle.rich_text
      .map((item) => item.plain_text ?? '')
      .join('')
      .trim();
    if (frontText.length === 0) {
      continue;
    }
    const front = wrapWithColorClass(
      toggle.toggle.color,
      renderRichText(toggle.toggle.rich_text)
    );
    patternHits['toggle'] = (patternHits['toggle'] ?? 0) + 1;
    const back = await renderToggleBack(toggle, fetchChildren);
    unsupportedTypes.push(...back.unsupportedTypes);
    cards.push({
      notion_block_id: toggle.id,
      notion_last_edited_at: new Date(toggle.last_edited_time),
      front,
      back: back.back,
      media: back.media,
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

  return { cards, diagnostic, unsupportedTypes };
};

export const walkNotionDatabaseForFlashcards = async (
  databaseId: string,
  fetchChildren: NotionBlockChildrenFetcher,
  fetchDatabasePages: NotionDatabasePagesFetcher
): Promise<WalkNotionPageResult> => {
  const pages = await fetchDatabasePages(databaseId);
  const limit = Math.min(pages.length, MAX_DATABASE_PAGES);

  const cards: WalkedNotionFlashcard[] = [];
  const patternHits: Record<string, number> = {};
  const unmatchedSamples: string[] = [];
  const unsupportedTypes: string[] = [];
  let blocksScanned = 0;

  for (let i = 0; i < limit; i++) {
    const page = await walkNotionPageForFlashcards(pages[i].id, fetchChildren);
    for (const card of page.cards) {
      cards.push({
        ...card,
        notion_page_id: pages[i].id,
        notion_page_title: pages[i].title ?? null,
      });
    }
    unsupportedTypes.push(...page.unsupportedTypes);
    blocksScanned += page.diagnostic.blocks_scanned;
    for (const [pattern, count] of Object.entries(
      page.diagnostic.pattern_hits
    )) {
      patternHits[pattern] = (patternHits[pattern] ?? 0) + count;
    }
    for (const sample of page.diagnostic.unmatched_samples ?? []) {
      if (unmatchedSamples.length < MAX_UNMATCHED_SAMPLES) {
        unmatchedSamples.push(sample);
      }
    }
  }

  const diagnostic: SyncDiagnostic = {
    blocks_scanned: blocksScanned,
    blocks_matched: cards.length,
    pattern_hits: patternHits,
  };

  if (unmatchedSamples.length > 0) {
    diagnostic.unmatched_samples = unmatchedSamples;
  }

  return { cards, diagnostic, unsupportedTypes };
};
