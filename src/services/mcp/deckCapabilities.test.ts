import { DECK_CAPABILITIES } from './deckCapabilities';
import { guessMarkdownCards } from '../../lib/parser/guessMarkdownCards';

describe('DECK_CAPABILITIES.inputFormats', () => {
  it('documents the four verified structures', () => {
    expect(
      DECK_CAPABILITIES.inputFormats.structures.map((s) => s.name)
    ).toEqual(['inline', 'toggle', 'heading', 'qa']);
  });

  it('every structure example parses to at least one note', () => {
    for (const structure of DECK_CAPABILITIES.inputFormats.structures) {
      const result = guessMarkdownCards(structure.example);
      expect(result).not.toBeNull();
      expect(result?.notes.length).toBeGreaterThan(0);
    }
  });

  it('the cloze note-type example carries cloze markup and parses to a note', () => {
    const cloze = DECK_CAPABILITIES.inputFormats.noteTypes.find(
      (n) => n.noteType === 'cloze'
    );
    expect(cloze).toBeDefined();
    expect(cloze?.text).toMatch(/\{\{c\d+::/);
    const result = guessMarkdownCards(cloze?.text ?? '');
    expect(result?.notes.length).toBeGreaterThan(0);
  });

  it('shows basic, basic-reversed, and input sharing the same source text', () => {
    const byType = new Map(
      DECK_CAPABILITIES.inputFormats.noteTypes.map((n) => [n.noteType, n.text])
    );
    expect(byType.get('basic')).toBe(byType.get('basic-reversed'));
    expect(byType.get('basic')).toBe(byType.get('input'));
  });

  it('does not ship an mcq example and directs mcq callers elsewhere', () => {
    expect(
      DECK_CAPABILITIES.inputFormats.noteTypes.some((n) => n.noteType === 'mcq')
    ).toBe(false);
    expect(DECK_CAPABILITIES.inputFormats.mcq).toContain('Notion');
  });
});
