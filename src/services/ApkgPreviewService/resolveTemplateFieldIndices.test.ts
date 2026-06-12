import { resolveTemplateFieldIndices } from './resolveTemplateFieldIndices';
import { NoteType } from './types';

const makeNoteType = (
  overrides: Partial<Pick<NoteType, 'fields' | 'templates'>> = {}
): Pick<NoteType, 'fields' | 'templates'> => ({
  fields: [
    { name: 'Front', ord: 0 },
    { name: 'Back', ord: 1 },
  ],
  templates: [
    {
      name: 'Card 1',
      ord: 0,
      qfmt: '{{Front}}',
      afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
    },
  ],
  ...overrides,
});

describe('resolveTemplateFieldIndices', () => {
  it('resolves the standard Basic template to 0 and 1', () => {
    expect(resolveTemplateFieldIndices(makeNoteType())).toEqual({
      frontFieldIndex: 0,
      backFieldIndex: 1,
    });
  });

  it('resolves a vocab template whose back is the third field', () => {
    const noteType = makeNoteType({
      fields: [
        { name: 'Word', ord: 0 },
        { name: 'Pronunciation', ord: 1 },
        { name: 'Meaning', ord: 2 },
      ],
      templates: [
        {
          name: 'Recognition',
          ord: 0,
          qfmt: '{{Word}}',
          afmt: '{{FrontSide}}<hr id="answer">{{Meaning}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 0,
      backFieldIndex: 2,
    });
  });

  it('resolves a reversed template that asks the second field first', () => {
    const noteType = makeNoteType({
      templates: [
        {
          name: 'Reversed',
          ord: 0,
          qfmt: '{{Back}}',
          afmt: '{{FrontSide}}<hr id="answer">{{Front}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 1,
      backFieldIndex: 0,
    });
  });

  it('skips conditional sections and specials when scanning references', () => {
    const noteType = makeNoteType({
      fields: [
        { name: 'Question', ord: 0 },
        { name: 'Hint', ord: 1 },
        { name: 'Answer', ord: 2 },
      ],
      templates: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{#Hint}}has hint{{/Hint}}{{Question}}',
          afmt: '{{FrontSide}}{{Tags}}{{Answer}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 0,
      backFieldIndex: 2,
    });
  });

  it('resolves modifier-prefixed references like cloze and hint', () => {
    const noteType = makeNoteType({
      fields: [
        { name: 'Text', ord: 0 },
        { name: 'Back Extra', ord: 1 },
      ],
      templates: [
        {
          name: 'Cloze',
          ord: 0,
          qfmt: '{{cloze:Text}}',
          afmt: '{{cloze:Text}}<br>{{hint:Back Extra}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 0,
      backFieldIndex: 1,
    });
  });

  it('uses the lowest-ord template when several exist', () => {
    const noteType = makeNoteType({
      templates: [
        {
          name: 'Card 2',
          ord: 1,
          qfmt: '{{Back}}',
          afmt: '{{FrontSide}}{{Front}}',
        },
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}',
          afmt: '{{FrontSide}}{{Back}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 0,
      backFieldIndex: 1,
    });
  });

  it('falls back to 0 and 1 when there are no templates', () => {
    expect(
      resolveTemplateFieldIndices(makeNoteType({ templates: [] }))
    ).toEqual({ frontFieldIndex: 0, backFieldIndex: 1 });
  });

  it('falls back to the other field when the answer references nothing new', () => {
    const noteType = makeNoteType({
      templates: [
        {
          name: 'Front only',
          ord: 0,
          qfmt: '{{Back}}',
          afmt: '{{FrontSide}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 1,
      backFieldIndex: 0,
    });
  });

  it('falls back to the first non-front field when the front is past field 1', () => {
    const noteType = makeNoteType({
      fields: [
        { name: 'Audio', ord: 0 },
        { name: 'Word', ord: 1 },
        { name: 'Meaning', ord: 2 },
      ],
      templates: [
        {
          name: 'Listening',
          ord: 0,
          qfmt: '{{Meaning}}',
          afmt: '{{FrontSide}}',
        },
      ],
    });
    expect(resolveTemplateFieldIndices(noteType)).toEqual({
      frontFieldIndex: 2,
      backFieldIndex: 0,
    });
  });
});
