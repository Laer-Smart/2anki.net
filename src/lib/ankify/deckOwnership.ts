import { buildDeckName } from './transforms/deckName';

export interface OwnedDeckSubscription {
  target_deck: string | null;
  notion_page_title: string | null;
}

const isSelfOrDescendant = (requested: string, owned: string): boolean =>
  requested === owned || requested.startsWith(`${owned}::`);

export const ownedDeckNames = (
  subscriptions: OwnedDeckSubscription[]
): string[] =>
  subscriptions.map((subscription) =>
    buildDeckName(subscription.target_deck, subscription.notion_page_title)
  );

export const userOwnsDeck = (
  requestedDeck: string,
  subscriptions: OwnedDeckSubscription[]
): boolean => {
  const trimmed = requestedDeck.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return ownedDeckNames(subscriptions).some((owned) =>
    isSelfOrDescendant(trimmed, owned)
  );
};
