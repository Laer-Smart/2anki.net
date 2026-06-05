import { applyTransformedFields } from './applyTransformedFields';
import { ParsedNote } from './types';

const basicNote: ParsedNote = {
  guid: 'g-1',
  modelKind: 'basic',
  modelName: 'Basic',
  fields: ['What is the mitochondrion?', 'The powerhouse of the cell.'],
  fieldNames: ['Front', 'Back'],
  tags: [],
};

describe('applyTransformedFields', () => {
  it('replaces the back field for translate_back', () => {
    const result = applyTransformedFields(basicNote, 'translate_back', {
      value: 'La central energética de la célula.',
    });
    expect(result.fields[1]).toBe('La central energética de la célula.');
    expect(result.fields[0]).toBe(basicNote.fields[0]);
    expect(result.modelKind).toBe('basic');
  });

  it('throws when translate_back result is empty', () => {
    expect(() =>
      applyTransformedFields(basicNote, 'translate_back', { value: '   ' })
    ).toThrow('translate_back result missing "value"');
  });

  it('writes translate_back into the chosen target field when provided', () => {
    const fourField: ParsedNote = {
      ...basicNote,
      fields: ['Word', 'Definition', 'Example', 'Image'],
      fieldNames: ['Word', 'Definition', 'Example', 'Image'],
    };
    const result = applyTransformedFields(
      fourField,
      'translate_back',
      { value: 'Definición traducida' },
      { sourceField: 1, targetField: 2 }
    );
    expect(result.fields[2]).toBe('Definición traducida');
    expect(result.fields[1]).toBe('Definition');
    expect(result.fields[3]).toBe('Image');
  });

  it('appends the example to the back field for add_example', () => {
    const result = applyTransformedFields(basicNote, 'add_example', {
      example: 'Mitochondria multiply rapidly in muscle cells.',
    });
    expect(result.fields[1]).toContain('The powerhouse of the cell.');
    expect(result.fields[1]).toContain(
      'Mitochondria multiply rapidly in muscle cells.'
    );
    expect(result.fields[1]).toContain('class="example"');
  });

  it('switches model kind to cloze for cloze_front', () => {
    const result = applyTransformedFields(basicNote, 'cloze_front', {
      cloze: 'The {{c1::mitochondrion}} is the powerhouse of the cell.',
    });
    expect(result.modelKind).toBe('cloze');
    expect(result.fields[0]).toBe(
      'The {{c1::mitochondrion}} is the powerhouse of the cell.'
    );
    expect(result.fields[1]).toBe('');
  });

  it('stores the hint as a separate field for add_hint', () => {
    const result = applyTransformedFields(basicNote, 'add_hint', {
      hint: 'Found in every cell.',
    });
    expect(result.hint).toBe('Found in every cell.');
    expect(result.fields[0]).toBe(basicNote.fields[0]);
    expect(result.fields[1]).toBe(basicNote.fields[1]);
  });

  describe('multi-field note type whose template back is not field 1', () => {
    const vocabNote: ParsedNote = {
      guid: 'g-2',
      modelKind: 'basic',
      modelName: 'Vocabulary',
      fields: ['der Hund', '[hʊnt]', 'the dog'],
      fieldNames: ['Word', 'Pronunciation', 'Meaning'],
      frontFieldIndex: 0,
      backFieldIndex: 2,
      tags: [],
    };

    it('writes translate_back into the template back field, not field 1', () => {
      const result = applyTransformedFields(vocabNote, 'translate_back', {
        value: 'el perro',
      });
      expect(result.fields).toEqual(['der Hund', '[hʊnt]', 'el perro']);
    });

    it('appends add_example to the template back field, not field 1', () => {
      const result = applyTransformedFields(vocabNote, 'add_example', {
        example: 'Der Hund schläft.',
      });
      expect(result.fields[1]).toBe('[hʊnt]');
      expect(result.fields[2]).toContain('the dog');
      expect(result.fields[2]).toContain('Der Hund schläft.');
    });

    it('clears the template back field for cloze_front, preserving other columns', () => {
      const result = applyTransformedFields(vocabNote, 'cloze_front', {
        cloze: '{{c1::der Hund}} means the dog.',
      });
      expect(result.fields).toEqual([
        '{{c1::der Hund}} means the dog.',
        '[hʊnt]',
        '',
      ]);
    });
  });
});
