import {
  classifyVerbatimShape,
  type VerbatimCard,
} from './classifyVerbatimShape';

const VALID_MCQ: VerbatimCard = {
  q: 'Which enzyme breaks down starch?',
  a: 'Amylase',
  options: ['Lipase', 'Amylase', 'Protease', 'Lactase'],
  correct_index: 1,
};

const CLOZE_MARKER_CARD: VerbatimCard = {
  q: 'The powerhouse of the cell is the {{c1::mitochondria}}',
  a: '',
};

const CLOZE_FLAG_CARD: VerbatimCard = {
  q: 'Capital of France',
  a: 'Paris',
  cloze: true,
};

const PLAIN_QA: VerbatimCard = {
  q: 'What is the capital of France?',
  a: 'Paris',
};

describe('classifyVerbatimShape', () => {
  it.each([
    ['valid 4-option single-answer card', VALID_MCQ, 'mcq'],
    ['card with {{c1::…}} cloze markers', CLOZE_MARKER_CARD, 'cloze'],
    ['card with the cloze flag set', CLOZE_FLAG_CARD, 'cloze'],
    ['plain question and answer', PLAIN_QA, 'basic'],
  ] as const)('classifies a %s as %s', (_label, card, expected) => {
    expect(classifyVerbatimShape(card)).toBe(expected);
  });

  it('falls back to basic when a card looks like MCQ but fails strict validation', () => {
    const ambiguousMcq: VerbatimCard = {
      q: 'Pick one',
      a: 'B',
      options: ['A', 'B', 'C'],
      correct_index: 1,
    };
    expect(classifyVerbatimShape(ambiguousMcq)).toBe('basic');
  });

  it('falls back to basic when correct_index is out of range', () => {
    const outOfRange: VerbatimCard = {
      q: 'Pick one',
      a: 'A',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 9,
    };
    expect(classifyVerbatimShape(outOfRange)).toBe('basic');
  });

  it('prefers mcq over cloze when a valid MCQ card also carries a cloze marker', () => {
    const mixed: VerbatimCard = {
      ...VALID_MCQ,
      q: 'Which enzyme breaks down {{c1::starch}}?',
    };
    expect(classifyVerbatimShape(mixed)).toBe('mcq');
  });
});
