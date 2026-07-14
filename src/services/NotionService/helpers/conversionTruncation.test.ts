import {
  buildNotionConversionSignalPayload,
  hasRuleBasedSubDecks,
  isTruncatedBlockFetch,
} from './conversionTruncation';

describe('isTruncatedBlockFetch', () => {
  it.each([
    [false, true, true],
    [false, false, false],
    [true, true, false],
    [true, false, false],
  ])('all=%s has_more=%s -> %s', (all, hasMore, expected) => {
    expect(isTruncatedBlockFetch(all, { has_more: hasMore })).toBe(expected);
  });
});

describe('hasRuleBasedSubDecks', () => {
  it('is false for the default child_page-only rule', () => {
    expect(hasRuleBasedSubDecks({ SUB_DECKS: ['child_page'] })).toBe(false);
  });

  it('is false when no sub-deck types are selected', () => {
    expect(hasRuleBasedSubDecks({ SUB_DECKS: [] })).toBe(false);
  });

  it.each([
    ['toggle'],
    ['heading_1'],
    ['heading_2'],
    ['heading_3'],
    ['child_database'],
  ])('is true when %s is selected', (type) => {
    expect(hasRuleBasedSubDecks({ SUB_DECKS: ['child_page', type] })).toBe(
      true
    );
  });
});

describe('buildNotionConversionSignalPayload', () => {
  it('returns undefined when there is neither truncation nor a dropped asset', () => {
    expect(buildNotionConversionSignalPayload(undefined, 0)).toBeUndefined();
  });

  it('serializes a namespaced truncation payload', () => {
    const payload = buildNotionConversionSignalPayload(
      { blocksConverted: 100, subDeckRulesSkipped: true },
      0
    );
    expect(JSON.parse(payload as string)).toEqual({
      code: 'notion_truncated',
      blocks_converted: 100,
      sub_deck_rules_skipped: true,
    });
  });

  it('serializes a dropped-assets-only payload', () => {
    const payload = buildNotionConversionSignalPayload(undefined, 3);
    expect(JSON.parse(payload as string)).toEqual({
      code: 'notion_assets_dropped',
      dropped_assets: 3,
    });
  });

  it('merges co-occurring truncation and dropped assets into one object', () => {
    const payload = buildNotionConversionSignalPayload(
      { blocksConverted: 100, subDeckRulesSkipped: false },
      2
    );
    expect(JSON.parse(payload as string)).toEqual({
      code: 'notion_truncated',
      blocks_converted: 100,
      sub_deck_rules_skipped: false,
      dropped_assets: 2,
    });
  });

  it('serializes a guessed-columns-only payload', () => {
    const payload = buildNotionConversionSignalPayload(undefined, 0, {
      frontField: 'Notes',
      backField: 'Tags',
    });
    expect(JSON.parse(payload as string)).toEqual({
      code: 'notion_columns_guessed',
      front_field: 'Notes',
      back_field: 'Tags',
    });
  });

  it('does not collide with the apkg_import done payload shape', () => {
    const parsed = JSON.parse(
      buildNotionConversionSignalPayload(
        { blocksConverted: 100, subDeckRulesSkipped: false },
        1
      ) as string
    );
    expect(parsed.total_notes).toBeUndefined();
    expect(parsed.imported).toBeUndefined();
    expect(parsed.notion_page_url).toBeUndefined();
  });
});
