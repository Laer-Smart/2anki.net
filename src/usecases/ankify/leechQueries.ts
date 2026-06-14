export const escapeDeckQueryValue = (deck: string): string =>
  deck.split('\\').join('\\\\').split('"').join('\\"');

const buildDeckScope = (ownedDeckNames: string[]): string | null => {
  if (ownedDeckNames.length === 0) {
    return null;
  }
  return ownedDeckNames
    .map((deck) => `deck:"${escapeDeckQueryValue(deck)}"`)
    .join(' OR ');
};

export const buildLeechListQuery = (
  ownedDeckNames: string[]
): string | null => {
  const scope = buildDeckScope(ownedDeckNames);
  if (scope == null) {
    return null;
  }
  return `tag:leech (${scope})`;
};

export const buildNoteOwnershipQuery = (
  noteId: number,
  ownedDeckNames: string[]
): string | null => {
  const scope = buildDeckScope(ownedDeckNames);
  if (scope == null) {
    return null;
  }
  return `nid:${noteId} (${scope})`;
};
