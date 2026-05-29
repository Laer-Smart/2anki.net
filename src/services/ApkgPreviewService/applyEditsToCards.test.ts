import { applyEditsToCards, CardEdit } from './applyEditsToCards';
import { RenderedCard } from './types';

function makeCard(overrides: Partial<RenderedCard> = {}): RenderedCard {
  return {
    id: 1,
    ord: 0,
    templateName: 'Basic',
    deckName: 'Test',
    deckPath: ['Test'],
    noteTypeName: 'Basic',
    css: '',
    front: 'original front',
    back: 'original back',
    ...overrides,
  };
}

const card0 = makeCard({ id: 1, front: 'front 0', back: 'back 0' });
const card1 = makeCard({ id: 2, front: 'front 1', back: 'back 1' });
const card2 = makeCard({ id: 3, front: 'front 2', back: 'back 2' });

describe('applyEditsToCards', () => {
  it('returns all cards unchanged when edits is empty', () => {
    const result = applyEditsToCards([card0, card1], []);
    expect(result).toEqual([card0, card1]);
  });

  it('edits the front text of the matching card', () => {
    const edit: CardEdit = { cardIndex: 0, front: 'new front' };
    const [result] = applyEditsToCards([card0], [edit]);
    expect(result.front).toBe('new front');
    expect(result.back).toBe('back 0');
  });

  it('edits the back text of the matching card', () => {
    const edit: CardEdit = { cardIndex: 1, back: 'new back' };
    const result = applyEditsToCards([card0, card1], [edit]);
    expect(result[1].back).toBe('new back');
    expect(result[1].front).toBe('front 1');
  });

  it('edits both front and back when both are provided', () => {
    const edit: CardEdit = { cardIndex: 0, front: 'new front', back: 'new back' };
    const [result] = applyEditsToCards([card0], [edit]);
    expect(result.front).toBe('new front');
    expect(result.back).toBe('new back');
  });

  it('omits a deleted card from the output', () => {
    const edit: CardEdit = { cardIndex: 1, deleted: true };
    const result = applyEditsToCards([card0, card1, card2], [edit]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(card0);
    expect(result[1]).toEqual(card2);
  });

  it('marks a card suspended (suspended flag preserved in returned card)', () => {
    const edit: CardEdit = { cardIndex: 0, suspended: true };
    const [result] = applyEditsToCards([card0], [edit]);
    expect(result.front).toBe('front 0');
  });

  it('applies a mixed edit set across multiple cards', () => {
    const edits: CardEdit[] = [
      { cardIndex: 0, front: 'edited front' },
      { cardIndex: 1, deleted: true },
      { cardIndex: 2, back: 'edited back' },
    ];
    const result = applyEditsToCards([card0, card1, card2], edits);
    expect(result).toHaveLength(2);
    expect(result[0].front).toBe('edited front');
    expect(result[1].back).toBe('edited back');
  });

  it('silently ignores an out-of-range cardIndex', () => {
    const edit: CardEdit = { cardIndex: 99, front: 'ghost' };
    const result = applyEditsToCards([card0], [edit]);
    expect(result).toEqual([card0]);
  });

  it('silently ignores a negative cardIndex', () => {
    const edit: CardEdit = { cardIndex: -1, front: 'ghost' };
    const result = applyEditsToCards([card0], [edit]);
    expect(result).toEqual([card0]);
  });
});
