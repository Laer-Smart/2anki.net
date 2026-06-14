import { AnkifyStatsDeck } from '../stats/types';
import { isSelfOrDescendantDeck } from '../lib/deckName';

export interface DeckTreeNode {
  deck: AnkifyStatsDeck;
  depth: number;
  aggregateDue: number;
  aggregateLearning: number;
  aggregateNew: number;
}

export const buildDeckTree = (decks: AnkifyStatsDeck[]): DeckTreeNode[] =>
  [...decks]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((deck) => {
      const descendants = decks.filter((other) =>
        isSelfOrDescendantDeck(other.fullName, deck.fullName)
      );
      return {
        deck,
        depth: deck.depth,
        aggregateDue: descendants.reduce((sum, d) => sum + d.review, 0),
        aggregateLearning: descendants.reduce((sum, d) => sum + d.learning, 0),
        aggregateNew: descendants.reduce((sum, d) => sum + d.new, 0),
      };
    });
