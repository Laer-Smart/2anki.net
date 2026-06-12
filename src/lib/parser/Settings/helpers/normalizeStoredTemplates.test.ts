import {
  normalizeStoredTemplates,
  pickCustomTemplate,
} from './normalizeStoredTemplates';

const LEGACY_TEMPLATE = {
  parent: 'Basic',
  name: 'ATTI BASIC',
  storageKey: 'n2a-basic',
  front: '<div class="atti">{{Front}}</div>',
  back: '<div class="atti-back">{{Back}}</div>',
  styling: '.atti { color: tomato; }',
};

const SAVED_NOTE_TYPE_ENTRY = {
  id: 'user-60392fd1-619c-43b2-8cab-20395a71b9cf',
  name: 'ATTI BASIC',
  description: '',
  baseType: 'basic',
  noteType: {
    id: 1780929933237,
    name: 'ATTI BASIC',
    type: 0,
    tmpls: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '<span class="front-text-pre">{{Front}}</span>',
        afmt: '<span class="front-text-pre">{{Front}}</span><hr>{{Back}}',
      },
    ],
    flds: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    css: '.front-text-pre { white-space: pre-wrap; }',
  },
  previewData: { Front: 'Q', Back: 'A' },
  tags: [],
};

describe('normalizeStoredTemplates', () => {
  it('returns legacy array payloads unchanged', () => {
    const result = normalizeStoredTemplates([LEGACY_TEMPLATE]);

    expect(result).toEqual([LEGACY_TEMPLATE]);
  });

  it('converts note-type editor payloads into template files', () => {
    const result = normalizeStoredTemplates({
      templates: [SAVED_NOTE_TYPE_ENTRY],
      hiddenIds: [],
    });

    expect(result).toEqual([
      {
        parent: '',
        name: 'ATTI BASIC',
        storageKey: 'n2a-basic',
        front: '<span class="front-text-pre">{{Front}}</span>',
        back: '<span class="front-text-pre">{{Front}}</span><hr>{{Back}}',
        styling: '.front-text-pre { white-space: pre-wrap; }',
      },
    ]);
  });

  it('maps cloze and input base types to their storage keys', () => {
    const cloze = {
      ...SAVED_NOTE_TYPE_ENTRY,
      name: 'ATTI CLOZE',
      baseType: 'cloze',
    };
    const input = {
      ...SAVED_NOTE_TYPE_ENTRY,
      name: 'ATTI INPUT',
      baseType: 'input',
    };

    const result = normalizeStoredTemplates({ templates: [cloze, input] });

    expect(result.map((t) => t.storageKey)).toEqual(['n2a-cloze', 'n2a-input']);
  });

  it('converts note-type entries mixed into a legacy array', () => {
    const result = normalizeStoredTemplates([
      LEGACY_TEMPLATE,
      SAVED_NOTE_TYPE_ENTRY,
    ]);

    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('ATTI BASIC');
    expect(result[1].storageKey).toBe('n2a-basic');
  });

  it('drops entries with an unknown base type or missing card template', () => {
    const unknownBase = { ...SAVED_NOTE_TYPE_ENTRY, baseType: 'occlusion' };
    const noTmpls = {
      ...SAVED_NOTE_TYPE_ENTRY,
      noteType: { ...SAVED_NOTE_TYPE_ENTRY.noteType, tmpls: [] },
    };

    expect(normalizeStoredTemplates({ templates: [unknownBase] })).toEqual([]);
    expect(normalizeStoredTemplates({ templates: [noTmpls] })).toEqual([]);
  });

  it('returns an empty list for null, strings, and shapeless objects', () => {
    expect(normalizeStoredTemplates(null)).toEqual([]);
    expect(normalizeStoredTemplates('nope')).toEqual([]);
    expect(normalizeStoredTemplates({ hiddenIds: [] })).toEqual([]);
  });
});

describe('pickCustomTemplate', () => {
  const other = { ...LEGACY_TEMPLATE, name: 'OTHER BASIC' };

  it('prefers the template whose name matches the configured model name', () => {
    const result = pickCustomTemplate(
      [other, LEGACY_TEMPLATE],
      'n2a-basic',
      'ATTI BASIC'
    );

    expect(result?.name).toBe('ATTI BASIC');
  });

  it('falls back to the first template with the storage key', () => {
    const result = pickCustomTemplate(
      [other, LEGACY_TEMPLATE],
      'n2a-basic',
      'NO SUCH NAME'
    );

    expect(result?.name).toBe('OTHER BASIC');
  });

  it('returns null when no template carries the storage key', () => {
    expect(pickCustomTemplate([other], 'n2a-cloze', 'ATTI CLOZE')).toBeNull();
  });
});
