export interface DeckCardTruncation {
  delivered: number;
  heldBack: number;
}

export function truncateDecksToCardLimit<T>(
  decks: { cards: T[] }[],
  limit: number
): DeckCardTruncation {
  const cap = Math.max(0, Math.floor(limit));
  let delivered = 0;
  let heldBack = 0;

  for (const deck of decks) {
    const remaining = cap - delivered;
    if (remaining <= 0) {
      heldBack += deck.cards.length;
      deck.cards = [];
      continue;
    }
    if (deck.cards.length > remaining) {
      heldBack += deck.cards.length - remaining;
      deck.cards = deck.cards.slice(0, remaining);
    }
    delivered += deck.cards.length;
  }

  return { delivered, heldBack };
}
