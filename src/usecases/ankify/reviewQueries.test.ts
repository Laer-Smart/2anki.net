import { buildCardOwnershipQuery, buildDueCardsQuery } from './reviewQueries';

describe('reviewQueries', () => {
  describe('buildDueCardsQuery', () => {
    it('scopes is:due to a single deck', () => {
      expect(buildDueCardsQuery('Notion Sync::Pharma')).toBe(
        '"deck:Notion Sync::Pharma" is:due'
      );
    });

    it('escapes quotes and backslashes in the deck name', () => {
      expect(buildDueCardsQuery('Week "18"\\x')).toBe(
        '"deck:Week \\"18\\"\\\\x" is:due'
      );
    });

    it('preserves the :: hierarchy separator', () => {
      expect(buildDueCardsQuery('MS3::Pharma::Sub')).toBe(
        '"deck:MS3::Pharma::Sub" is:due'
      );
    });
  });

  describe('buildCardOwnershipQuery', () => {
    it('constrains a card id to a single owned deck with cid:', () => {
      expect(buildCardOwnershipQuery(9001, ['Notion Sync::Pharma'])).toBe(
        'cid:9001 ("deck:Notion Sync::Pharma")'
      );
    });

    it('ORs multiple owned decks', () => {
      expect(
        buildCardOwnershipQuery(9001, [
          'Notion Sync::Pharma',
          'Notion Sync::Torts',
        ])
      ).toBe(
        'cid:9001 ("deck:Notion Sync::Pharma" OR "deck:Notion Sync::Torts")'
      );
    });

    it('escapes quotes and backslashes', () => {
      expect(buildCardOwnershipQuery(42, ['Week "18"\\x'])).toBe(
        'cid:42 ("deck:Week \\"18\\"\\\\x")'
      );
    });

    it('returns null when there are no owned decks', () => {
      expect(buildCardOwnershipQuery(9001, [])).toBeNull();
    });
  });
});
