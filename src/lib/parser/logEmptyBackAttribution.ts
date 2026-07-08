const EMPTY_BACK_RATIO_THRESHOLD = 0.2;
const MIN_CARDS_FOR_ATTRIBUTION = 10;

interface EmptyBackDeck {
  emptyBackCount?: number;
  cardCount?: number;
  parsePath?: string;
}

export function logEmptyBackAttribution(
  decks: readonly EmptyBackDeck[],
  source: string
): void {
  for (const deck of decks) {
    const cardCount = deck.cardCount ?? 0;
    const emptyBackCount = deck.emptyBackCount ?? 0;
    if (cardCount < MIN_CARDS_FOR_ATTRIBUTION) {
      continue;
    }
    if (emptyBackCount <= cardCount * EMPTY_BACK_RATIO_THRESHOLD) {
      continue;
    }
    console.log(
      `[empty-backs] ${JSON.stringify({
        parsePath: deck.parsePath ?? 'unknown',
        emptyBackCount,
        cardCount,
        source,
      })}`
    );
  }
}

export default logEmptyBackAttribution;
