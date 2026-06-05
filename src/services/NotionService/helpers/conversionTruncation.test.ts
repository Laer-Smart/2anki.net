import {
  buildNotionTruncationPayload,
  hasRuleBasedSubDecks,
  isTruncatedBlockFetch,
} from './conversionTruncation';

describe('isTruncatedBlockFetch', () => {
  it.each([
    [false, true, true],
    [false, false, false],
    [true, true, false],
    [true, false, false],
  ])(
    'all=%s has_more=%s -> %s',
    (all, hasMore, expected) => {
      expect(isTruncatedBlockFetch(all, { has_more: hasMore })).toBe(expected);
    }
  );
});

describe('hasRuleBasedSubDecks', () => {
  it('is false for the default child_page-only rule', () => {
    expect(hasRuleBasedSubDecks({ SUB_DECKS: ['child_page'] })).toBe(false);
  });

  it('is false when no sub-deck types are selected', () => {
    expect(hasRuleBasedSubDecks({ SUB_DECKS: [] })).toBe(false);
  });

  it.each([['toggle'], ['heading_1'], ['heading_2'], ['heading_3'], ['child_database']])(
    'is true when %s is selected',
    (type) => {
      expect(hasRuleBasedSubDecks({ SUB_DECKS: ['child_page', type] })).toBe(
        true
      );
    }
  );
});

describe('buildNotionTruncationPayload', () => {
  it('serializes a namespaced JSON payload', () => {
    const payload = buildNotionTruncationPayload({
      blocksConverted: 100,
      subDeckRulesSkipped: true,
    });
    expect(JSON.parse(payload)).toEqual({
      code: 'notion_truncated',
      blocks_converted: 100,
      sub_deck_rules_skipped: true,
    });
  });

  it('does not collide with the apkg_import done payload shape', () => {
    const parsed = JSON.parse(
      buildNotionTruncationPayload({
        blocksConverted: 100,
        subDeckRulesSkipped: false,
      })
    );
    expect(parsed.total_notes).toBeUndefined();
    expect(parsed.imported).toBeUndefined();
    expect(parsed.notion_page_url).toBeUndefined();
  });
});
