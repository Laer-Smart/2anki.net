import {
  getDefaultTemplates,
  getBasicReversedNoteType,
  getInputNoteType,
} from './DefaultTemplatesService';
import { validateTemplateFields } from '../lib/templates/validateTemplateFields';

describe('getDefaultTemplates', () => {
  const templates = getDefaultTemplates();

  it('surfaces the Basic Reversed and Type the answer starters', () => {
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('basic-reversed');
    expect(ids).toContain('input-type-the-answer');
  });

  it('only references fields that exist on each note type', () => {
    const failures: string[] = [];
    for (const template of templates) {
      const result = validateTemplateFields(template.noteType);
      if (!result.ok) {
        failures.push(`${template.id}: ${result.message}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('getBasicReversedNoteType', () => {
  const noteType = getBasicReversedNoteType();

  it('generates two card templates from the same Front + Back fields', () => {
    expect(noteType.tmpls).toHaveLength(2);
    expect(noteType.tmpls[0].qfmt).toContain('{{Front}}');
    expect(noteType.tmpls[0].afmt).toContain('{{Back}}');
    expect(noteType.tmpls[1].qfmt).toContain('{{Back}}');
    expect(noteType.tmpls[1].afmt).toContain('{{Front}}');
  });

  it('declares exactly the Front and Back fields', () => {
    expect(noteType.flds.map((f) => f.name)).toEqual(['Front', 'Back']);
  });
});

describe('getInputNoteType', () => {
  const noteType = getInputNoteType();

  it('uses {{type:Back}} on the front so Anki diffs the typed answer', () => {
    expect(noteType.tmpls[0].qfmt).toContain('{{type:Back}}');
    expect(noteType.tmpls[0].afmt).toContain('{{type:Back}}');
  });

  it('declares Front and Back fields only', () => {
    expect(noteType.flds.map((f) => f.name)).toEqual(['Front', 'Back']);
  });
});
