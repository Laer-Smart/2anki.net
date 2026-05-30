import {
  extractFieldRefs,
  validateTemplateFields,
} from './validateTemplateFields';

describe('extractFieldRefs', () => {
  it('extracts plain {{field}} references', () => {
    expect(extractFieldRefs('{{Front}} and {{Back}}')).toEqual([
      'Front',
      'Back',
    ]);
  });

  it('extracts {{#field}} section openers', () => {
    expect(extractFieldRefs('{{#Hint}}{{Hint}}{{/Hint}}')).toEqual([
      'Hint',
      'Hint',
      'Hint',
    ]);
  });

  it('extracts {{^field}} inverted section openers', () => {
    expect(extractFieldRefs('{{^Hint}}no hint{{/Hint}}')).toEqual([
      'Hint',
      'Hint',
    ]);
  });

  it('strips filter prefixes like type:, cloze:, hint:', () => {
    expect(
      extractFieldRefs('{{type:Front}} {{cloze:Text}} {{hint:Notes}}')
    ).toEqual(['Front', 'Text', 'Notes']);
  });

  it('strips chained filter prefixes (furigana:kanji:Text)', () => {
    expect(extractFieldRefs('{{furigana:kanji:Text}}')).toEqual(['Text']);
  });

  it('includes FrontSide as a token so callers can exclude it', () => {
    expect(extractFieldRefs('{{FrontSide}}<hr>{{Back}}')).toEqual([
      'FrontSide',
      'Back',
    ]);
  });

  it('ignores empty tokens', () => {
    expect(extractFieldRefs('{{}} {{ }}')).toEqual([]);
  });
});

describe('validateTemplateFields', () => {
  const baseNoteType = {
    name: 'Basic',
    tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{Back}}' }],
    flds: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    css: '',
  };

  it('passes when every reference resolves against flds', () => {
    expect(validateTemplateFields(baseNoteType)).toEqual({ ok: true });
  });

  it('treats FrontSide as a built-in (does not flag it)', () => {
    const noteType = {
      ...baseNoteType,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}',
          afmt: '{{FrontSide}}<hr>{{Back}}',
        },
      ],
    };
    expect(validateTemplateFields(noteType)).toEqual({ ok: true });
  });

  it('strips filter prefixes before resolving the field', () => {
    const noteType = {
      ...baseNoteType,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{type:Front}}',
          afmt: '{{cloze:Back}}',
        },
      ],
    };
    expect(validateTemplateFields(noteType)).toEqual({ ok: true });
  });

  it('reports a missing field with a VOICE-compliant message', () => {
    const noteType = {
      ...baseNoteType,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}{{#text2 image}}{{text2 image}}{{/text2 image}}',
          afmt: '{{Back}}',
        },
      ],
    };
    const result = validateTemplateFields(noteType);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(['text2 image']);
    expect(result.message).toBe(
      "Template references a field that doesn't exist: text2 image. Add the field or remove the reference."
    );
  });

  it('deduplicates repeated references to the same missing field', () => {
    const noteType = {
      ...baseNoteType,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Ghost}}{{#Ghost}}{{/Ghost}}',
          afmt: '{{Ghost}}',
        },
      ],
    };
    const result = validateTemplateFields(noteType);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(['Ghost']);
  });

  it('lists every missing field across all card templates', () => {
    const noteType = {
      ...baseNoteType,
      tmpls: [
        { name: 'Card 1', ord: 0, qfmt: '{{Alpha}}', afmt: '{{Back}}' },
        { name: 'Card 2', ord: 1, qfmt: '{{Beta}}', afmt: '{{Back}}' },
      ],
    };
    const result = validateTemplateFields(noteType);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(['Alpha', 'Beta']);
    expect(result.message).toBe(
      "Template references fields that don't exist: Alpha, Beta. Add the fields or remove the references."
    );
  });
});
