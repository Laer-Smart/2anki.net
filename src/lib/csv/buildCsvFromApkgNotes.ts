import { ParsedNote } from '../ankify/transforms/types';

const NEEDS_QUOTING = /[",\r\n]/;

function escapeField(value: string): string {
  if (!NEEDS_QUOTING.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function unionFieldNames(notes: readonly ParsedNote[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const note of notes) {
    for (const name of note.fieldNames) {
      if (seen.has(name)) continue;
      seen.add(name);
      ordered.push(name);
    }
  }
  return ordered;
}

function buildRow(note: ParsedNote, fieldHeaders: readonly string[]): string {
  const fieldByName = new Map<string, string>();
  for (let i = 0; i < note.fieldNames.length; i += 1) {
    fieldByName.set(note.fieldNames[i], note.fields[i] ?? '');
  }
  const cells: string[] = [note.modelName];
  for (const header of fieldHeaders) {
    cells.push(fieldByName.get(header) ?? '');
  }
  cells.push(note.tags.join(' '));
  return cells.map(escapeField).join(',');
}

export function buildCsvFromApkgNotes(notes: readonly ParsedNote[]): string {
  const fieldHeaders =
    notes.length === 0 ? ['Front', 'Back'] : unionFieldNames(notes);
  const header = ['Model', ...fieldHeaders, 'Tags'].map(escapeField).join(',');
  const lines = [header];
  for (const note of notes) {
    lines.push(buildRow(note, fieldHeaders));
  }
  return `${lines.join('\r\n')}\r\n`;
}
