import { describe, expect, it } from 'vitest';

import {
  addField,
  removeField,
  renameField,
  setPreviewValue,
} from './editFields';
import { buildEmptyNoteType } from './buildNoteType';

describe('addField', () => {
  it('appends a new field with a unique name', () => {
    const draft = buildEmptyNoteType('basic');
    const after = addField(draft);
    expect(after.noteType.flds.map((f) => f.name)).toEqual([
      'Front',
      'Back',
      'New field',
    ]);
    expect(after.previewData['New field']).toBe('');
  });

  it('disambiguates the new field name when one already exists', () => {
    const draft = buildEmptyNoteType('basic');
    const once = addField(draft);
    const twice = addField(once);
    expect(twice.noteType.flds.map((f) => f.name)).toEqual([
      'Front',
      'Back',
      'New field',
      'New field 2',
    ]);
  });
});

describe('renameField', () => {
  it('renames the field and migrates its previewData entry', () => {
    const draft = buildEmptyNoteType('basic');
    const after = renameField(draft, 0, 'Question');
    expect(after.noteType.flds[0].name).toBe('Question');
    expect(after.previewData.Question).toBe(draft.previewData.Front);
    expect(after.previewData.Front).toBeUndefined();
  });

  it('disambiguates when the new name collides with another field', () => {
    const draft = buildEmptyNoteType('basic');
    const after = renameField(draft, 0, 'Back');
    expect(after.noteType.flds[0].name).toBe('Back 2');
  });

  it('does nothing when the trimmed name is empty', () => {
    const draft = buildEmptyNoteType('basic');
    const after = renameField(draft, 0, '   ');
    expect(after).toBe(draft);
  });
});

describe('removeField', () => {
  it('removes the field and re-indexes ords', () => {
    const draft = addField(buildEmptyNoteType('basic'));
    const after = removeField(draft, 1);
    expect(after.noteType.flds.map((f) => f.name)).toEqual([
      'Front',
      'New field',
    ]);
    expect(after.noteType.flds.map((f) => f.ord)).toEqual([0, 1]);
  });

  it('drops the previewData entry for the removed field', () => {
    const draft = buildEmptyNoteType('basic');
    const after = removeField(draft, 1);
    expect(after.previewData.Back).toBeUndefined();
    expect(after.previewData.Front).toBe(draft.previewData.Front);
  });

  it('refuses to remove the last remaining field', () => {
    const draft = removeField(buildEmptyNoteType('basic'), 1);
    const after = removeField(draft, 0);
    expect(after).toBe(draft);
  });
});

describe('setPreviewValue', () => {
  it('updates a single previewData entry without touching the rest', () => {
    const draft = buildEmptyNoteType('basic');
    const after = setPreviewValue(draft, 'Front', 'new value');
    expect(after.previewData.Front).toBe('new value');
    expect(after.previewData.Back).toBe(draft.previewData.Back);
  });
});
