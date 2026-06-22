export const NOTION_TRUNCATED_CODE = 'notion_truncated';
export const NOTION_ASSETS_DROPPED_CODE = 'notion_assets_dropped';

export interface ConversionTruncation {
  blocksConverted: number;
  subDeckRulesSkipped: boolean;
}

export function isTruncatedBlockFetch(
  all: boolean,
  response: { has_more: boolean }
): boolean {
  return !all && response.has_more;
}

export function hasRuleBasedSubDecks(rules: { SUB_DECKS: string[] }): boolean {
  return rules.SUB_DECKS.some((type) => type !== 'child_page');
}

export function buildNotionConversionSignalPayload(
  truncation: ConversionTruncation | undefined,
  droppedAssetCount: number
): string | undefined {
  const hasDroppedAssets = droppedAssetCount > 0;
  if (truncation == null && !hasDroppedAssets) {
    return undefined;
  }

  const payload: {
    code: string;
    blocks_converted?: number;
    sub_deck_rules_skipped?: boolean;
    dropped_assets?: number;
  } = {
    code:
      truncation != null ? NOTION_TRUNCATED_CODE : NOTION_ASSETS_DROPPED_CODE,
  };

  if (truncation != null) {
    payload.blocks_converted = truncation.blocksConverted;
    payload.sub_deck_rules_skipped = truncation.subDeckRulesSkipped;
  }

  if (hasDroppedAssets) {
    payload.dropped_assets = droppedAssetCount;
  }

  return JSON.stringify(payload);
}
