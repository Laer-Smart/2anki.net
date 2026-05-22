import { looksLikeCloze, transformBlankToCloze } from './ChatDeckUseCase';

describe('looksLikeCloze', () => {
  it('returns true for a single cloze marker', () => {
    expect(looksLikeCloze('Paris is the capital of {{c1::France}}')).toBe(true);
  });

  it('returns true for multi-digit cloze numbers', () => {
    expect(looksLikeCloze('{{c12::elephant}} memory')).toBe(true);
  });

  it('returns true when more than one cloze marker is present', () => {
    expect(
      looksLikeCloze('{{c1::mitochondria}} is the {{c2::powerhouse}} of the cell')
    ).toBe(true);
  });

  it('returns true when the marker is embedded in HTML', () => {
    expect(looksLikeCloze('<p>What is <b>{{c1::Paris}}</b>?</p>')).toBe(true);
  });

  it('returns false on plain Q/A text', () => {
    expect(looksLikeCloze('What is the capital of France?')).toBe(false);
  });

  it('returns false when only the opening braces are present', () => {
    expect(looksLikeCloze('Render {{ as braces}}')).toBe(false);
  });

  it('returns false when cloze marker has no digit', () => {
    expect(looksLikeCloze('{{c::Paris}} broken syntax')).toBe(false);
  });

  it('returns false on an empty string', () => {
    expect(looksLikeCloze('')).toBe(false);
  });
});

describe('transformBlankToCloze', () => {
  it('rewrites a single ___ blank with the back content as {{c1::...}}', () => {
    expect(
      transformBlankToCloze({
        front: 'The Norwegian word for hunting is ___.',
        back: 'jakt',
      })
    ).toEqual({
      front: 'The Norwegian word for hunting is {{c1::jakt}}.',
      back: '',
    });
  });

  it('only rewrites the first blank when the front has multiple', () => {
    expect(
      transformBlankToCloze({
        front: 'A ___ eats ___ for breakfast.',
        back: 'cat',
      })
    ).toEqual({
      front: 'A {{c1::cat}} eats ___ for breakfast.',
      back: '',
    });
  });

  it('leaves the card unchanged when front already uses canonical cloze syntax', () => {
    const card = {
      front: 'The capital of {{c1::France}} is Paris.',
      back: '',
    };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('leaves the card unchanged when there is no blank pattern in the front', () => {
    const card = { front: 'What is the capital of France?', back: 'Paris' };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('leaves the card unchanged when back is empty or whitespace-only', () => {
    const card = { front: 'A ___ is a furry pet.', back: '   ' };
    expect(transformBlankToCloze(card)).toEqual(card);
  });

  it('trims surrounding whitespace from the back content before substitution', () => {
    expect(
      transformBlankToCloze({
        front: 'Hjort means ___ in English.',
        back: '  deer  ',
      })
    ).toEqual({
      front: 'Hjort means {{c1::deer}} in English.',
      back: '',
    });
  });

  it('accepts 2-or-more underscores as a blank marker', () => {
    expect(
      transformBlankToCloze({
        front: 'Two underscores too: __',
        back: 'still works',
      })
    ).toEqual({
      front: 'Two underscores too: {{c1::still works}}',
      back: '',
    });
  });
});
