import { describe, expect, it } from 'vitest';
import { effectiveTemplateForCards } from './templates';

const basicCard = { front: 'Capital of France?', back: 'Paris' };
const clozeCard = { front: 'The capital of France is {{c1::Paris}}.', back: '' };
const mcqCard = {
  front: 'Which enzyme hydrolyses starch?',
  back: '',
  options: ['Lipase', 'Amylase', 'Protease', 'Lactase'],
  correctIndex: 1,
};

describe('effectiveTemplateForCards', () => {
  it('returns the selected template when there are no cards', () => {
    expect(effectiveTemplateForCards([], 'basic')).toBe('basic');
  });

  it('reports cloze when every card is a cloze deletion even if basic is selected', () => {
    expect(effectiveTemplateForCards([clozeCard, clozeCard], 'basic')).toBe(
      'cloze'
    );
  });

  it('reports mcq when every card is multiple choice even if basic is selected', () => {
    expect(effectiveTemplateForCards([mcqCard], 'basic')).toBe('mcq');
  });

  it('keeps the selected template for plain front/back cards', () => {
    expect(effectiveTemplateForCards([basicCard], 'basic')).toBe('basic');
  });

  it('preserves basic-and-reversed for plain front/back cards', () => {
    expect(effectiveTemplateForCards([basicCard], 'basic-and-reversed')).toBe(
      'basic-and-reversed'
    );
  });

  it('reports basic for plain front/back cards when a stale mcq is selected', () => {
    expect(effectiveTemplateForCards([basicCard], 'mcq')).toBe('basic');
  });

  it('reports basic for plain front/back cards when a stale cloze is selected', () => {
    expect(effectiveTemplateForCards([basicCard], 'cloze')).toBe('basic');
  });

  it('falls back to the selected template when card kinds are mixed', () => {
    expect(effectiveTemplateForCards([clozeCard, basicCard], 'cloze')).toBe(
      'cloze'
    );
  });
});
