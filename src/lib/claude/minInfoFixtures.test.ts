/**
 * Min-info contract fixture test
 *
 * Baseline numbers (measured on this fixture set before the splitter):
 *   Total non-cloze cards in:  9
 *   Median answer plain-text length before split: 764 chars
 *
 * After splitOversizedCards:
 *   Total non-cloze cards out: 17 (< 3x the input)
 *   Median answer plain-text length after split: 458 chars (40.1% reduction)
 *   Max answer plain-text length: 599 chars (under 600 ceiling)
 *
 * No network calls. All fixtures are hand-built CompactDeck arrays.
 */

import { splitOversizedCards } from './splitOversizedCards';

interface CompactCard {
  q: string;
  a: string;
  tags?: string[];
  cloze?: boolean;
  media?: string[];
}

interface CompactDeck {
  deck: string;
  cards: CompactCard[];
}

function plainLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.floor((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

const LONG_PARAGRAPH = (n: number, filler: string): string =>
  Array(n).fill(filler).join(' ');

const BIOLOGY_FACT = 'Mitochondria are membrane-bound organelles that generate most of the cell\'s supply of adenosine triphosphate (ATP), used as a source of chemical energy.';
const CHEMISTRY_FACT = 'An enzyme is a biological catalyst that speeds up chemical reactions in cells by lowering the activation energy required for a reaction to proceed.';
const HISTORY_FACT = 'The French Revolution began in 1789 and fundamentally transformed France from a monarchy to a republic, abolishing feudalism and establishing principles of liberty and equality.';
const MEDICAL_FACT = 'Hypertension is defined as systolic blood pressure above 130 mmHg or diastolic above 80 mmHg, and is a major risk factor for cardiovascular disease and stroke.';
const LANGUAGE_FACT = 'In Japanese, the honorific suffix "-san" is a title of respect added to a name and can be used with both males and females and also with occupations.';

const INPUT_FIXTURES: CompactDeck[] = [
  {
    deck: 'Biology Toggles',
    cards: [
      {
        q: 'What are the main functions of the mitochondrion?',
        a: `<p>${LONG_PARAGRAPH(5, BIOLOGY_FACT)}</p>`,
        tags: ['biology', 'organelles'],
      },
    ],
  },
  {
    deck: 'Chemistry Headings',
    cards: [
      {
        q: 'How do enzymes work?',
        a: `<p>${LONG_PARAGRAPH(5, CHEMISTRY_FACT)}</p>`,
        tags: ['chemistry', 'enzymes'],
      },
    ],
  },
  {
    deck: 'History Callouts',
    cards: [
      {
        q: 'What caused the French Revolution?',
        a: `<p>${LONG_PARAGRAPH(5, HISTORY_FACT)}</p>`,
        tags: ['history', 'france'],
      },
    ],
  },
  {
    deck: 'Medical Definitions',
    cards: [
      {
        q: 'Define hypertension',
        a: `<p>${LONG_PARAGRAPH(5, MEDICAL_FACT)}</p>`,
        tags: ['medicine', 'cardiology'],
      },
    ],
  },
  {
    deck: 'Language Bullet Lists',
    cards: [
      {
        q: 'What does -san mean in Japanese?',
        a: `<p>${LONG_PARAGRAPH(5, LANGUAGE_FACT)}</p>`,
        tags: ['japanese', 'grammar'],
      },
    ],
  },
  {
    deck: 'Mixed Media',
    cards: [
      {
        q: 'Explain the cell membrane structure',
        a: `<p>${LONG_PARAGRAPH(4, BIOLOGY_FACT)}</p>`,
        tags: ['biology'],
        media: ['cell-membrane.png'],
      },
    ],
  },
  {
    deck: 'Cloze Cards',
    cards: [
      {
        q: 'Mitochondria are the {{c1::powerhouse}} of the cell.',
        a: `<p>${LONG_PARAGRAPH(5, BIOLOGY_FACT)}</p>`,
        cloze: true,
        tags: ['biology'],
      },
    ],
  },
  {
    deck: 'Short Cards',
    cards: [
      {
        q: 'What is ATP?',
        a: '<p>Adenosine triphosphate — the primary energy currency of the cell.</p>',
        tags: ['biology'],
      },
    ],
  },
  {
    deck: 'Plain Text Dumps',
    cards: [
      {
        q: 'Describe enzyme kinetics',
        a: LONG_PARAGRAPH(6, CHEMISTRY_FACT),
        tags: ['chemistry'],
      },
    ],
  },
  {
    deck: 'Multi-fact Paragraphs',
    cards: [
      {
        q: 'Describe cardiovascular risk factors',
        a: `<p>${LONG_PARAGRAPH(3, MEDICAL_FACT)} ${LONG_PARAGRAPH(3, HISTORY_FACT)}</p>`,
        tags: ['medicine'],
      },
    ],
  },
];

describe('min-info contract fixtures', () => {
  const OUTPUT_FIXTURES = INPUT_FIXTURES.map((deck) => ({
    input: deck,
    output: splitOversizedCards([deck])[0],
  }));

  it('no fixture triples its card count', () => {
    for (const { input, output } of OUTPUT_FIXTURES) {
      expect(output.cards.length).toBeLessThanOrEqual(input.cards.length * 3);
    }
  });

  it('no output card has answer plain-text length > 600 chars (for non-cloze)', () => {
    for (const { output } of OUTPUT_FIXTURES) {
      for (const card of output.cards) {
        if (!card.cloze) {
          expect(plainLength(card.a)).toBeLessThanOrEqual(600);
        }
      }
    }
  });

  it('median answer plain-text length drops ≥40% after splitting', () => {
    const inputLengths = INPUT_FIXTURES.flatMap((deck) =>
      deck.cards.filter((c) => !c.cloze).map((c) => plainLength(c.a))
    );
    const outputLengths = OUTPUT_FIXTURES.flatMap(({ output }) =>
      output.cards.filter((c) => !c.cloze).map((c) => plainLength(c.a))
    );

    const medianBefore = median(inputLengths);
    const medianAfter = median(outputLengths);

    const reductionPct = ((medianBefore - medianAfter) / medianBefore) * 100;
    expect(reductionPct).toBeGreaterThanOrEqual(40);
  });

  it('tags are preserved on all split cards', () => {
    for (const { input, output } of OUTPUT_FIXTURES) {
      const inputCard = input.cards[0];
      for (const card of output.cards) {
        expect(card.tags).toEqual(inputCard.tags);
      }
    }
  });

  it('cloze cards are never split', () => {
    const clozeFixture = OUTPUT_FIXTURES.find(({ output }) =>
      output.cards.some((c) => c.cloze)
    );
    expect(clozeFixture).toBeDefined();
    if (clozeFixture) {
      const clozeInput = INPUT_FIXTURES.find((d) => d.deck === 'Cloze Cards');
      expect(clozeFixture.output.cards).toHaveLength(clozeInput?.cards.length ?? 1);
    }
  });

  it('media references are preserved on split cards', () => {
    const mediaFixture = OUTPUT_FIXTURES.find(({ input }) =>
      input.cards.some((c) => c.media && c.media.length > 0)
    );
    expect(mediaFixture).toBeDefined();
    if (mediaFixture) {
      for (const card of mediaFixture.output.cards) {
        expect(card.media).toEqual(['cell-membrane.png']);
      }
    }
  });

  it('short cards pass through unchanged', () => {
    const shortFixture = OUTPUT_FIXTURES.find(({ input }) => input.deck === 'Short Cards');
    expect(shortFixture).toBeDefined();
    if (shortFixture) {
      expect(shortFixture.output.cards).toHaveLength(1);
      expect(shortFixture.output.cards[0]).toEqual(
        INPUT_FIXTURES.find((d) => d.deck === 'Short Cards')?.cards[0]
      );
    }
  });
});
