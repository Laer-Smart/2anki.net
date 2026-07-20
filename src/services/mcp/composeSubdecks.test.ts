import {
  composeDeckName,
  groupCardsBySubdeck,
  hasSubdecks,
} from './composeSubdecks';

describe('composeDeckName', () => {
  it('nests a leaf name under the parent', () => {
    expect(composeDeckName('JLPT N5', 'Vocabulary')).toBe(
      'JLPT N5::Vocabulary'
    );
  });

  it('keeps the card in the parent when no deck is given', () => {
    expect(composeDeckName('JLPT N5', undefined)).toBe('JLPT N5');
    expect(composeDeckName('JLPT N5', null)).toBe('JLPT N5');
    expect(composeDeckName('JLPT N5', '   ')).toBe('JLPT N5');
  });

  it('nests deeper when the card deck itself carries ::', () => {
    expect(composeDeckName('JLPT N5', 'Verbs::Irregular')).toBe(
      'JLPT N5::Verbs::Irregular'
    );
  });

  it('does not double-prefix when the card sent the full path (idempotence)', () => {
    expect(composeDeckName('JLPT N5', 'JLPT N5::Vocabulary')).toBe(
      'JLPT N5::Vocabulary'
    );
  });

  it('uses the card deck as-is when it equals the parent', () => {
    expect(composeDeckName('JLPT N5', 'JLPT N5')).toBe('JLPT N5');
  });

  it('never treats a card deck as absolute — a bare-prefix collision still nests', () => {
    expect(composeDeckName('MS3::Pharmacology', 'MS3::PharmacologyExtra')).toBe(
      'MS3::Pharmacology::MS3::PharmacologyExtra'
    );
  });
});

describe('hasSubdecks', () => {
  it('is true when at least one card carries a non-empty deck', () => {
    expect(
      hasSubdecks([
        { front: 'a', back: 'b' },
        { front: 'c', back: 'd', deck: 'Vocabulary' },
      ])
    ).toBe(true);
  });

  it('is false when no card carries a deck', () => {
    expect(
      hasSubdecks([
        { front: 'a', back: 'b' },
        { front: 'c', back: 'd' },
      ])
    ).toBe(false);
  });

  it('is false when the only deck values are blank', () => {
    expect(hasSubdecks([{ front: 'a', back: 'b', deck: '  ' }])).toBe(false);
  });
});

describe('groupCardsBySubdeck', () => {
  it('groups cards under composed deck names, preserving first-seen order', () => {
    const groups = groupCardsBySubdeck('JLPT N5', [
      { front: 'ichi', back: '1', deck: 'Vocabulary' },
      { front: 'taberu', back: 'to eat', deck: 'Grammar' },
      { front: 'ni', back: '2', deck: 'Vocabulary' },
    ]);
    expect(groups).toEqual([
      {
        deck: 'JLPT N5::Vocabulary',
        cards: [
          { front: 'ichi', back: '1' },
          { front: 'ni', back: '2' },
        ],
      },
      {
        deck: 'JLPT N5::Grammar',
        cards: [{ front: 'taberu', back: 'to eat' }],
      },
    ]);
  });

  it('puts deckless cards in the bare parent bucket', () => {
    const groups = groupCardsBySubdeck('JLPT N5', [
      { front: 'intro', back: 'welcome' },
      { front: 'ichi', back: '1', deck: 'Vocabulary' },
    ]);
    expect(groups).toEqual([
      { deck: 'JLPT N5', cards: [{ front: 'intro', back: 'welcome' }] },
      { deck: 'JLPT N5::Vocabulary', cards: [{ front: 'ichi', back: '1' }] },
    ]);
  });
});
