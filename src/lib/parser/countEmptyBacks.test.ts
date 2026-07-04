import { countEmptyBacks } from './countEmptyBacks';

interface Card {
  front: string;
  back: string;
}

const getBack = (c: Card) => c.back;
const getFront = (c: Card) => c.front;

describe('countEmptyBacks', () => {
  it('counts a card whose back is an empty string and front is non-empty', () => {
    const cards: Card[] = [
      { front: 'What is the capital of France?', back: '' },
    ];
    expect(countEmptyBacks(cards, getBack, getFront)).toBe(1);
  });

  it('counts a card whose back is only whitespace', () => {
    const cards: Card[] = [{ front: 'Question', back: '   \n\t ' }];
    expect(countEmptyBacks(cards, getBack, getFront)).toBe(1);
  });

  it('excludes a card whose front is also empty (a different discard)', () => {
    const cards: Card[] = [{ front: '', back: '' }];
    expect(countEmptyBacks(cards, getBack, getFront)).toBe(0);
  });

  it('excludes a fully populated card', () => {
    const cards: Card[] = [{ front: 'Question', back: 'Answer' }];
    expect(countEmptyBacks(cards, getBack, getFront)).toBe(0);
  });

  it('counts only the empty-back cards in a mixed set', () => {
    const cards: Card[] = [
      { front: 'a', back: 'A' },
      { front: 'b', back: '' },
      { front: '', back: '' },
      { front: 'd', back: '   ' },
    ];
    expect(countEmptyBacks(cards, getBack, getFront)).toBe(2);
  });

  it('returns 0 for an empty list', () => {
    expect(countEmptyBacks([], getBack, getFront)).toBe(0);
  });

  it('treats a null/undefined back as empty', () => {
    const cards = [{ front: 'q', back: null }];
    expect(
      countEmptyBacks(
        cards,
        (c) => c.back,
        (c) => c.front
      )
    ).toBe(1);
  });
});
