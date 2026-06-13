import { AnkifyStatsDeck } from '../stats/types';
import { isSelfOrDescendantDeck } from './deckName';

export interface DeckBacklog {
  due: number;
  fresh: number;
}

export const sumDeckBacklog = (
  ownedDeck: string,
  decks: AnkifyStatsDeck[]
): DeckBacklog => {
  let due = 0;
  let fresh = 0;
  for (const deck of decks) {
    if (isSelfOrDescendantDeck(deck.name, ownedDeck)) {
      due += deck.review + deck.learning;
      fresh += deck.new;
    }
  }
  return { due, fresh };
};

export const formatBacklog = (backlog: DeckBacklog): string | null => {
  const parts: string[] = [];
  if (backlog.due > 0) {
    parts.push(`▲${backlog.due}`);
  }
  if (backlog.fresh > 0) {
    parts.push(`+${backlog.fresh} new`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const formatMaturity = (
  matureCount: number,
  total: number
): string | null => {
  if (total <= 0) {
    return null;
  }
  const pct = Math.round((matureCount / total) * 100);
  return `${pct}% mature`;
};
