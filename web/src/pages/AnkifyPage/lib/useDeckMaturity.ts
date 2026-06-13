import { useQueries } from '@tanstack/react-query';

import { Backend, DeckMaturity } from '../../../lib/backend/Backend';

export const useDeckMaturity = (
  backend: Backend,
  deckNames: string[]
): Map<string, DeckMaturity> => {
  const results = useQueries({
    queries: deckNames.map((deck) => ({
      queryKey: ['ankify-deck-maturity', deck],
      queryFn: () => backend.getAnkifyDeckMaturity(deck),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    })),
  });

  const byDeck = new Map<string, DeckMaturity>();
  deckNames.forEach((deck, index) => {
    const data = results[index]?.data;
    if (data != null) {
      byDeck.set(deck, data);
    }
  });
  return byDeck;
};
