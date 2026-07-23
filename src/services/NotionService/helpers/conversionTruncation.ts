export const NOTION_TRUNCATED_CODE = 'notion_truncated';
export const NOTION_ASSETS_DROPPED_CODE = 'notion_assets_dropped';
export const NOTION_COLUMNS_GUESSED_CODE = 'notion_columns_guessed';
export const MONTHLY_LIMIT_PARTIAL_CODE = 'monthly_limit_partial';

export interface MonthlyLimitPartial {
  cardsDelivered: number;
  cardsHeldBack: number;
  limit: number;
  resetOn: string;
}

export function buildMonthlyLimitPartialPayload(
  partial: MonthlyLimitPartial
): string {
  return JSON.stringify({
    code: MONTHLY_LIMIT_PARTIAL_CODE,
    cards_delivered: partial.cardsDelivered,
    cards_held_back: partial.cardsHeldBack,
    limit: partial.limit,
    reset_on: partial.resetOn,
  });
}

export interface ConversionTruncation {
  blocksConverted: number;
  subDeckRulesSkipped: boolean;
}

export interface GuessedColumnMapping {
  frontField: string;
  backField: string;
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

function pickSignalCode(
  truncation: ConversionTruncation | undefined,
  hasDroppedAssets: boolean
): string {
  if (truncation != null) {
    return NOTION_TRUNCATED_CODE;
  }
  if (hasDroppedAssets) {
    return NOTION_ASSETS_DROPPED_CODE;
  }
  return NOTION_COLUMNS_GUESSED_CODE;
}

export function buildNotionConversionSignalPayload(
  truncation: ConversionTruncation | undefined,
  droppedAssetCount: number,
  guessedColumns?: GuessedColumnMapping
): string | undefined {
  const hasDroppedAssets = droppedAssetCount > 0;
  if (truncation == null && !hasDroppedAssets && guessedColumns == null) {
    return undefined;
  }

  const payload: {
    code: string;
    blocks_converted?: number;
    sub_deck_rules_skipped?: boolean;
    dropped_assets?: number;
    front_field?: string;
    back_field?: string;
  } = {
    code: pickSignalCode(truncation, hasDroppedAssets),
  };

  if (truncation != null) {
    payload.blocks_converted = truncation.blocksConverted;
    payload.sub_deck_rules_skipped = truncation.subDeckRulesSkipped;
  }

  if (hasDroppedAssets) {
    payload.dropped_assets = droppedAssetCount;
  }

  if (guessedColumns != null) {
    payload.front_field = guessedColumns.frontField;
    payload.back_field = guessedColumns.backField;
  }

  return JSON.stringify(payload);
}
