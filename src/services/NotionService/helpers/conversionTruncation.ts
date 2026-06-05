export const NOTION_TRUNCATED_CODE = 'notion_truncated';

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

export function buildNotionTruncationPayload(
  truncation: ConversionTruncation
): string {
  return JSON.stringify({
    code: NOTION_TRUNCATED_CODE,
    blocks_converted: truncation.blocksConverted,
    sub_deck_rules_skipped: truncation.subDeckRulesSkipped,
  });
}
