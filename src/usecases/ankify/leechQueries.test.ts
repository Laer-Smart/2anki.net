import {
  buildLeechListQuery,
  buildNoteOwnershipQuery,
  escapeDeckQueryValue,
} from './leechQueries';

describe('leechQueries', () => {
  describe('escapeDeckQueryValue', () => {
    it.each([
      ['plain', 'Notion Sync::Pharmacology', 'Notion Sync::Pharmacology'],
      ['double quote', 'Week "18"', 'Week \\"18\\"'],
      ['backslash', 'a\\b', 'a\\\\b'],
      ['both', 'a\\"b', 'a\\\\\\"b'],
    ])('escapes %s', (_label, input, expected) => {
      expect(escapeDeckQueryValue(input)).toBe(expected);
    });
  });

  describe('buildLeechListQuery', () => {
    it('scopes tag:leech to a single owned deck', () => {
      expect(buildLeechListQuery(['Notion Sync::Pharmacology'])).toBe(
        'tag:leech ("deck:Notion Sync::Pharmacology")'
      );
    });

    it('ORs multiple owned decks', () => {
      expect(
        buildLeechListQuery(['Notion Sync::Pharma', 'Notion Sync::Torts'])
      ).toBe('tag:leech ("deck:Notion Sync::Pharma" OR "deck:Notion Sync::Torts")');
    });

    it('escapes deck names with quotes and backslashes', () => {
      expect(buildLeechListQuery(['Week "18"\\x'])).toBe(
        'tag:leech ("deck:Week \\"18\\"\\\\x")'
      );
    });

    it('returns null when there are no owned decks', () => {
      expect(buildLeechListQuery([])).toBeNull();
    });
  });

  describe('buildNoteOwnershipQuery', () => {
    it('constrains a note id to a single owned deck', () => {
      expect(buildNoteOwnershipQuery(7001, ['Notion Sync::Pharma'])).toBe(
        'nid:7001 ("deck:Notion Sync::Pharma")'
      );
    });

    it('ORs multiple owned decks', () => {
      expect(
        buildNoteOwnershipQuery(7001, ['Notion Sync::Pharma', 'Notion Sync::Torts'])
      ).toBe(
        'nid:7001 ("deck:Notion Sync::Pharma" OR "deck:Notion Sync::Torts")'
      );
    });

    it('escapes deck names with quotes and backslashes', () => {
      expect(buildNoteOwnershipQuery(42, ['Week "18"\\x'])).toBe(
        'nid:42 ("deck:Week \\"18\\"\\\\x")'
      );
    });

    it('returns null when there are no owned decks', () => {
      expect(buildNoteOwnershipQuery(7001, [])).toBeNull();
    });
  });
});
