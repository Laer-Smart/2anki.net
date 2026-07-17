import { describe, expect, it } from 'vitest';
import {
  effectiveTemplateForCards,
  isPureClientReshape,
  parseDeckName,
  suggestDeckName,
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

describe('parseDeckName', () => {
  it('extracts the name from a Deck: line', () => {
    expect(parseDeckName('Here are your cards.\nDeck: Foo Bar')).toBe(
      'Foo Bar'
    );
  });

  it('extracts a name with an em dash and unicode', () => {
    expect(parseDeckName('Deck: Japanese — Time Words')).toBe(
      'Japanese — Time Words'
    );
  });

  it('strips surrounding markdown emphasis', () => {
    expect(parseDeckName('Deck: **Organic Chemistry**')).toBe(
      'Organic Chemistry'
    );
  });

  it('matches case-insensitively and trims whitespace', () => {
    expect(parseDeckName('deck:   Cell Biology   ')).toBe('Cell Biology');
  });

  it('returns null when there is no Deck line', () => {
    expect(parseDeckName('Here are some flashcards for you.')).toBeNull();
  });

  it('returns null for an empty Deck line', () => {
    expect(parseDeckName('Deck:   ')).toBeNull();
  });
});

describe('suggestDeckName', () => {
  it('prefers the Deck line over the conversation title', () => {
    expect(suggestDeckName('Deck: Foo Bar', 'Some conversation')).toBe(
      'Foo Bar'
    );
  });

  it('falls back to the conversation title when there is no Deck line', () => {
    expect(suggestDeckName('Just some cards.', 'Cell Biology chat')).toBe(
      'Cell Biology chat'
    );
  });

  it('returns null when neither a Deck line nor a title is present', () => {
    expect(suggestDeckName('Just some cards.', null)).toBeNull();
    expect(suggestDeckName('Just some cards.', '   ')).toBeNull();
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
