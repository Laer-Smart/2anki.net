import { splitOversizedCards } from './splitOversizedCards';

const CEILING = 600;

function plainLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').length;
}

describe('splitOversizedCards', () => {
  it('passes through cards under the ceiling unchanged', () => {
    const decks = [
      {
        deck: 'Test',
        cards: [{ q: 'Q', a: 'Short answer.' }],
      },
    ];
    expect(splitOversizedCards(decks)).toEqual(decks);
  });

  it('splits a long answer on sentence boundaries', () => {
    const longAnswer = Array(10)
      .fill(
        'This is a sentence that contains some interesting fact about biology.'
      )
      .join(' ');
    expect(plainLength(longAnswer)).toBeGreaterThan(CEILING);

    const decks = [
      {
        deck: 'Test',
        cards: [{ q: 'What is biology?', a: longAnswer }],
      },
    ];
    const result = splitOversizedCards(decks);
    expect(result[0].cards.length).toBeGreaterThan(1);
    for (const card of result[0].cards) {
      expect(plainLength(card.a)).toBeLessThanOrEqual(CEILING);
    }
  });

  it('preserves the parent question on each split card', () => {
    const longAnswer = Array(12)
      .fill('Mitochondria produce ATP via oxidative phosphorylation.')
      .join(' ');
    const decks = [
      {
        deck: 'Bio',
        cards: [{ q: 'What do mitochondria do?', a: longAnswer }],
      },
    ];
    const result = splitOversizedCards(decks);
    for (const card of result[0].cards) {
      expect(card.q).toBe('What do mitochondria do?');
    }
  });

  it('preserves tags on each split card', () => {
    const longAnswer = Array(12)
      .fill('The enzyme catalyzes the reaction quickly in optimal conditions.')
      .join(' ');
    const decks = [
      {
        deck: 'Chem',
        cards: [
          {
            q: 'Enzyme function?',
            a: longAnswer,
            tags: ['biochem', 'enzymes'],
          },
        ],
      },
    ];
    const result = splitOversizedCards(decks);
    for (const card of result[0].cards) {
      expect(card.tags).toEqual(['biochem', 'enzymes']);
    }
  });

  it('never splits cloze cards', () => {
    const longAnswer = Array(8)
      .fill(
        'This cloze answer contains {{c1::important}} information about {{c2::biology}}.'
      )
      .join(' ');
    const decks = [
      {
        deck: 'Cloze',
        cards: [{ q: 'Cloze front {{c1::X}}', a: longAnswer, cloze: true }],
      },
    ];
    const result = splitOversizedCards(decks);
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].a).toBe(longAnswer);
  });

  it('preserves HTML tag balance across splits', () => {
    const sentences = Array(12)
      .fill(
        'The <strong>mitochondria</strong> is the powerhouse of the <em>cell</em>.'
      )
      .join(' ');
    const decks = [
      {
        deck: 'Bio',
        cards: [{ q: 'Cell organelles?', a: sentences }],
      },
    ];
    const result = splitOversizedCards(decks);
    for (const card of result[0].cards) {
      const openStrong = (card.a.match(/<strong>/g) ?? []).length;
      const closeStrong = (card.a.match(/<\/strong>/g) ?? []).length;
      const openEm = (card.a.match(/<em>/g) ?? []).length;
      const closeEm = (card.a.match(/<\/em>/g) ?? []).length;
      expect(openStrong).toBe(closeStrong);
      expect(openEm).toBe(closeEm);
    }
  });

  it('clamps output to 3x the input card count (no runaway fragmentation)', () => {
    const manyShortSentences = Array(30).fill('A.').join(' ');
    const decks = [
      {
        deck: 'Test',
        cards: [{ q: 'Q', a: manyShortSentences }],
      },
    ];
    const result = splitOversizedCards(decks);
    expect(result[0].cards.length).toBeLessThanOrEqual(3);
  });

  it('keeps a single-sentence answer over 600 chars as-is (degenerate case)', () => {
    const singleSentence = 'A'.repeat(700);
    const decks = [
      {
        deck: 'Test',
        cards: [{ q: 'Q', a: singleSentence }],
      },
    ];
    const result = splitOversizedCards(decks);
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].a).toBe(singleSentence);
  });

  it('preserves media references on each split card', () => {
    const longAnswer = Array(12)
      .fill('This fact includes an image reference to remember the concept.')
      .join(' ');
    const decks = [
      {
        deck: 'Media',
        cards: [{ q: 'Q', a: longAnswer, media: ['diagram.png'] }],
      },
    ];
    const result = splitOversizedCards(decks);
    for (const card of result[0].cards) {
      expect(card.media).toEqual(['diagram.png']);
    }
  });

  it('handles empty decks array without error', () => {
    expect(splitOversizedCards([])).toEqual([]);
  });

  it('handles a deck with no cards', () => {
    const decks = [{ deck: 'Empty', cards: [] }];
    expect(splitOversizedCards(decks)).toEqual(decks);
  });
});
