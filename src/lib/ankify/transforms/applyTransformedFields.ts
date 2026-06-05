import { FieldSelection, ParsedNote, TransformName, TransformedNote } from './types';

export interface TransformResultPayload {
  value?: string;
  example?: string;
  cloze?: string;
  hint?: string;
}

function appendExample(back: string, example: string): string {
  const trimmedExample = example.trim();
  if (trimmedExample.length === 0) return back;
  const separator = back.endsWith('>') || back.length === 0 ? '' : '\n';
  return `${back}${separator}<div class="example"><b>Example:</b> ${trimmedExample}</div>`;
}

const writeField = (
  note: ParsedNote,
  index: number,
  value: string
): string[] => {
  const next = [...note.fields];
  while (next.length <= index) next.push('');
  next[index] = value;
  return next;
};

const defaultBackIndex = (note: ParsedNote): number =>
  note.backFieldIndex ?? Math.max(1, Math.min(note.fields.length - 1, 1));

export function applyTransformedFields(
  note: ParsedNote,
  transform: TransformName,
  payload: TransformResultPayload,
  selection: FieldSelection = {}
): TransformedNote {
  if (transform === 'translate_back') {
    const value = payload.value?.trim();
    if (value == null || value.length === 0) {
      throw new Error('translate_back result missing "value"');
    }
    const targetIndex = selection.targetField ?? selection.sourceField ?? defaultBackIndex(note);
    return { ...note, fields: writeField(note, targetIndex, value) };
  }

  if (transform === 'add_example') {
    const example = payload.example?.trim();
    if (example == null || example.length === 0) {
      throw new Error('add_example result missing "example"');
    }
    const targetIndex = selection.targetField ?? defaultBackIndex(note);
    const current = note.fields[targetIndex] ?? '';
    return {
      ...note,
      fields: writeField(note, targetIndex, appendExample(current, example)),
    };
  }

  if (transform === 'cloze_front') {
    const cloze = payload.cloze?.trim();
    if (cloze == null || cloze.length === 0) {
      throw new Error('cloze_front result missing "cloze"');
    }
    const targetIndex = selection.sourceField ?? note.frontFieldIndex ?? 0;
    const cleared = writeField(note, targetIndex, cloze);
    const backIndex = defaultBackIndex(note);
    if (backIndex !== targetIndex) {
      cleared[backIndex] = '';
    }
    return {
      ...note,
      modelKind: 'cloze',
      fields: cleared,
    };
  }

  const hint = payload.hint?.trim();
  if (hint == null || hint.length === 0) {
    throw new Error('add_hint result missing "hint"');
  }
  return { ...note, hint };
}
