import {
  buildCardExistsQuery,
  buildDueCardsQuery,
  buildNewCardsQuery,
} from './reviewQueries';

describe('reviewQueries', () => {
  describe('buildDueCardsQuery', () => {
    it('scopes is:due to a single deck', () => {
      expect(buildDueCardsQuery('Notion Sync::Pharma')).toBe(
        'deck:"Notion Sync::Pharma" is:due'
      );
    });

    it('matches a deck name with a space and a colon', () => {
      expect(buildDueCardsQuery('Part 1: Listening comprehension')).toBe(
        'deck:"Part 1: Listening comprehension" is:due'
      );
    });

    it('escapes quotes and backslashes in the deck name', () => {
      expect(buildDueCardsQuery('Week "18"\\x')).toBe(
        'deck:"Week \\"18\\"\\\\x" is:due'
      );
    });

    it('preserves the :: hierarchy separator', () => {
      expect(buildDueCardsQuery('MS3::Pharma::Sub')).toBe(
        'deck:"MS3::Pharma::Sub" is:due'
      );
    });
  });

  describe('buildNewCardsQuery', () => {
    it('scopes is:new to a single deck and excludes suspended and buried', () => {
      expect(buildNewCardsQuery('Notion Sync::Pharma')).toBe(
        'deck:"Notion Sync::Pharma" is:new -is:suspended -is:buried'
      );
    });

    it('escapes quotes and backslashes in the deck name', () => {
      expect(buildNewCardsQuery('Week "18"\\x')).toBe(
        'deck:"Week \\"18\\"\\\\x" is:new -is:suspended -is:buried'
      );
    });
  });

  describe('buildCardExistsQuery', () => {
    it('matches a single card id with cid:', () => {
      expect(buildCardExistsQuery(9001)).toBe('cid:9001');
    });
  });
});
