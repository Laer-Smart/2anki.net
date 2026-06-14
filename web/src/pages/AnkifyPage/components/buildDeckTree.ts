import { AnkifyStatsDeck } from '../stats/types';
import { isSelfOrDescendantDeck } from '../lib/deckName';

export interface DeckTreeNode {
  deck: AnkifyStatsDeck;
  depth: number;
  hasChildren: boolean;
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
      const hasChildren = decks.some((other) =>
        other.fullName.startsWith(`${deck.fullName}::`)
      );
      return {
        deck,
        depth: deck.depth,
        hasChildren,
        aggregateDue: descendants.reduce((sum, d) => sum + d.review, 0),
        aggregateLearning: descendants.reduce((sum, d) => sum + d.learning, 0),
        aggregateNew: descendants.reduce((sum, d) => sum + d.new, 0),
      };
    });
