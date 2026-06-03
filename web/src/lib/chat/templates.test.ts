import { describe, expect, it } from 'vitest';
import {
  effectiveTemplateForCards,
  isPureClientReshape,
  templateSwitchLabel,
} from './templates';

const basicCard = { front: 'Capital of France?', back: 'Paris' };
const clozeCard = {
  front: 'The capital of France is {{c1::Paris}}.',
  back: '',
};
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

describe('isPureClientReshape', () => {
  it('is true switching between basic and basic-and-reversed', () => {
    expect(isPureClientReshape('basic', 'basic-and-reversed')).toBe(true);
    expect(isPureClientReshape('basic-and-reversed', 'basic')).toBe(true);
  });

  it('is false when either side leaves the basic family', () => {
    expect(isPureClientReshape('basic', 'cloze')).toBe(false);
    expect(isPureClientReshape('cloze', 'basic')).toBe(false);
    expect(isPureClientReshape('basic-and-reversed', 'mcq')).toBe(false);
  });
});

describe('templateSwitchLabel', () => {
  it('names the cloze target', () => {
    expect(templateSwitchLabel('cloze')).toBe('Switching to Cloze');
  });

  it('names the multiple-choice target', () => {
    expect(templateSwitchLabel('mcq')).toBe('Switching to multiple choice');
  });

  it('names the basic target for both basic and basic-and-reversed', () => {
    expect(templateSwitchLabel('basic')).toBe('Switching to Basic');
    expect(templateSwitchLabel('basic-and-reversed')).toBe(
      'Switching to Basic'
    );
  });
});
