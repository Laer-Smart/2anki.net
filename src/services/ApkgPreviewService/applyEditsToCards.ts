import { RenderedCard } from './types';

export interface CardEdit {
  cardIndex: number;
  front?: string;
  back?: string;
  deleted?: boolean;
  suspended?: boolean;
}

export function applyEditsToCards(
  cards: RenderedCard[],
  edits: CardEdit[]
): RenderedCard[] {
  const editByIndex = new Map<number, CardEdit>();
  for (const edit of edits) {
    if (edit.cardIndex >= 0 && edit.cardIndex < cards.length) {
      editByIndex.set(edit.cardIndex, edit);
    }
  }

  const result: RenderedCard[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const edit = editByIndex.get(i);
    if (edit?.deleted) continue;
    if (edit) {
      result.push({
        ...card,
        front: edit.front ?? card.front,
        back: edit.back ?? card.back,
      });
    } else {
      result.push(card);
    }
  }
  return result;
}
