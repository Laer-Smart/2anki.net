import { escapeDeckQueryValue } from './leechQueries';

export const buildDueCardsQuery = (deck: string): string =>
  `"deck:${escapeDeckQueryValue(deck)}" is:due`;

export const buildCardExistsQuery = (cardId: number): string => `cid:${cardId}`;
