import { escapeDeckQueryValue } from './leechQueries';

const buildDeckScope = (ownedDeckNames: string[]): string | null => {
  if (ownedDeckNames.length === 0) {
    return null;
  }
  return ownedDeckNames
    .map((deck) => `"deck:${escapeDeckQueryValue(deck)}"`)
    .join(' OR ');
};

export const buildDueCardsQuery = (deck: string): string =>
  `"deck:${escapeDeckQueryValue(deck)}" is:due`;

export const buildCardOwnershipQuery = (
  cardId: number,
  ownedDeckNames: string[]
): string | null => {
  const scope = buildDeckScope(ownedDeckNames);
  if (scope == null) {
    return null;
  }
  return `cid:${cardId} (${scope})`;
};
