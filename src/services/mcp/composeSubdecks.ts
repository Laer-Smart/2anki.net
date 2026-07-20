import { sanitizeDeckPath } from '../../lib/ankify/transforms/tags';

export interface CardWithDeck {
  front: string;
  back: string;
  deck?: string;
}

export interface SubdeckGroup {
  deck: string;
  cards: { front: string; back: string }[];
}

export function composeDeckName(
  parent: string,
  cardDeck: string | undefined | null
): string {
  const parentPath = sanitizeDeckPath(parent);
  if (cardDeck == null) {
    return parentPath;
  }
  const leaf = sanitizeDeckPath(cardDeck);
  if (leaf.length === 0) {
    return parentPath;
  }
  if (leaf === parentPath || leaf.startsWith(`${parentPath}::`)) {
    return leaf;
  }
  return sanitizeDeckPath(`${parentPath}::${leaf}`);
}

export function hasSubdecks(cards: CardWithDeck[]): boolean {
  return cards.some(
    (card) => typeof card.deck === 'string' && card.deck.trim().length > 0
  );
}

export function groupCardsBySubdeck(
  parent: string,
  cards: CardWithDeck[]
): SubdeckGroup[] {
  const order: string[] = [];
  const byDeck = new Map<string, { front: string; back: string }[]>();
  for (const card of cards) {
    const name = composeDeckName(parent, card.deck);
    let bucket = byDeck.get(name);
    if (bucket == null) {
      bucket = [];
      byDeck.set(name, bucket);
      order.push(name);
    }
    bucket.push({ front: card.front, back: card.back });
  }
  return order.map((deck) => ({ deck, cards: byDeck.get(deck) ?? [] }));
}
