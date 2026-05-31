import CardOption from '../../../../lib/parser/Settings';

export default function mergeChildPageSettings(
  parent: CardOption,
  child: CardOption
): CardOption {
  const merged: CardOption = Object.assign(
    Object.create(Object.getPrototypeOf(parent)),
    parent
  );
  (merged as { deckName: string | undefined }).deckName = child.deckName;
  return merged;
}
