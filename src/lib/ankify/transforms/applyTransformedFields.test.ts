import { applyTransformedFields } from './applyTransformedFields';
import { ParsedNote } from './types';

const basicNote: ParsedNote = {
  guid: 'g-1',
  modelKind: 'basic',
  front: 'What is the mitochondrion?',
  back: 'The powerhouse of the cell.',
  tags: [],
};

describe('applyTransformedFields', () => {
  it('replaces the back field for translate_back', () => {
    const result = applyTransformedFields(basicNote, 'translate_back', {
      back: 'La central energética de la célula.',
    });
    expect(result.back).toBe('La central energética de la célula.');
    expect(result.front).toBe(basicNote.front);
    expect(result.modelKind).toBe('basic');
  });

  it('throws when translate_back result is empty', () => {
    expect(() =>
      applyTransformedFields(basicNote, 'translate_back', { back: '   ' })
    ).toThrow('translate_back result missing "back"');
  });

  it('appends the example to the back field for add_example', () => {
    const result = applyTransformedFields(basicNote, 'add_example', {
      example: 'Mitochondria multiply rapidly in muscle cells.',
    });
    expect(result.back).toContain('The powerhouse of the cell.');
    expect(result.back).toContain(
      'Mitochondria multiply rapidly in muscle cells.'
    );
    expect(result.back).toContain('class="example"');
  });

  it('switches model kind to cloze for cloze_front', () => {
    const result = applyTransformedFields(basicNote, 'cloze_front', {
      cloze: 'The {{c1::mitochondrion}} is the powerhouse of the cell.',
    });
    expect(result.modelKind).toBe('cloze');
    expect(result.front).toBe(
      'The {{c1::mitochondrion}} is the powerhouse of the cell.'
    );
    expect(result.back).toBe('');
  });

  it('stores the hint as a separate field for add_hint', () => {
    const result = applyTransformedFields(basicNote, 'add_hint', {
      hint: 'Found in every cell.',
    });
    expect(result.hint).toBe('Found in every cell.');
    expect(result.front).toBe(basicNote.front);
    expect(result.back).toBe(basicNote.back);
  });
});
