import { buildCsvFromApkgNotes } from './buildCsvFromApkgNotes';
import { ParsedNote } from '../ankify/transforms/types';

function basicNote(
  fields: string[],
  tags: string[] = [],
  fieldNames: string[] = ['Front', 'Back']
): ParsedNote {
  return {
    guid: `guid-${fields.join('|')}`,
    modelKind: 'basic',
    modelName: 'Basic',
    fields,
    fieldNames,
    tags,
  };
}

function clozeNote(
  fields: string[],
  tags: string[] = [],
  fieldNames: string[] = ['Text', 'Extra']
): ParsedNote {
  return {
    guid: `guid-${fields.join('|')}`,
    modelKind: 'cloze',
    modelName: 'Cloze',
    fields,
    fieldNames,
    tags,
  };
}

describe('buildCsvFromApkgNotes', () => {
  it('returns a CSV with only the header row for an empty notes array', () => {
    const csv = buildCsvFromApkgNotes([]);
    expect(csv).toBe('Model,Front,Back,Tags\r\n');
  });

  it('emits one row per basic note with model, fields, and tags', () => {
    const notes: ParsedNote[] = [
      basicNote(['What is the capital of France?', 'Paris'], ['geography', 'europe']),
      basicNote(['2 + 2', '4']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Model,Front,Back,Tags');
    expect(lines[1]).toBe('Basic,What is the capital of France?,Paris,geography europe');
    expect(lines[2]).toBe('Basic,2 + 2,4,');
    expect(lines[3]).toBe('');
  });

  it('preserves cloze markup in the cloze field column and marks model as Cloze', () => {
    const notes: ParsedNote[] = [
      clozeNote(['The capital of {{c1::France}} is {{c2::Paris}}', 'Geography note']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Model,Text,Extra,Tags');
    expect(lines[1]).toBe(
      'Cloze,The capital of {{c1::France}} is {{c2::Paris}},Geography note,'
    );
  });

  it('quotes fields containing commas, quotes, or newlines per RFC 4180', () => {
    const notes: ParsedNote[] = [
      basicNote(['Has, a comma', 'plain']),
      basicNote(['He said "hi"', 'plain']),
      basicNote(['line one\nline two', 'plain']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('Basic,"Has, a comma",plain,');
    expect(lines[2]).toBe('Basic,"He said ""hi""",plain,');
    expect(lines[3]).toContain('"line one\nline two"');
  });

  it('joins tags with a single space', () => {
    const notes: ParsedNote[] = [
      basicNote(['Q', 'A'], ['biology', 'cells', 'anatomy']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    expect(csv).toContain('Basic,Q,A,biology cells anatomy\r\n');
  });

  it('uses the first note field-name header when notes share a model', () => {
    const notes: ParsedNote[] = [
      basicNote(['Q', 'A'], [], ['Question', 'Answer']),
      basicNote(['Q2', 'A2'], [], ['Question', 'Answer']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const headerLine = csv.split('\r\n')[0];
    expect(headerLine).toBe('Model,Question,Answer,Tags');
  });

  it('pads rows when notes have differing field counts and unions headers in order', () => {
    const notes: ParsedNote[] = [
      basicNote(['Q1', 'A1'], [], ['Front', 'Back']),
      {
        guid: 'g3',
        modelKind: 'basic',
        modelName: 'BasicWithExtra',
        fields: ['Q2', 'A2', 'extra'],
        fieldNames: ['Front', 'Back', 'Notes'],
        tags: [],
      },
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Model,Front,Back,Notes,Tags');
    expect(lines[1]).toBe('Basic,Q1,A1,,');
    expect(lines[2]).toBe('BasicWithExtra,Q2,A2,extra,');
  });

  it('quotes a field that contains a CR character', () => {
    const notes: ParsedNote[] = [basicNote(['has\rreturn', 'A'])];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('"has\rreturn"');
  });

  it('quotes a header that contains a comma or quote', () => {
    const notes: ParsedNote[] = [
      basicNote(['Q', 'A'], [], ['Front, side', 'Back "side"']),
    ];
    const csv = buildCsvFromApkgNotes(notes);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Model,"Front, side","Back ""side""",Tags');
  });
});
