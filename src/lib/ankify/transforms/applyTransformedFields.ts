import { ParsedNote, TransformName, TransformedNote } from './types';

export interface TransformResultPayload {
  back?: string;
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

export function applyTransformedFields(
  note: ParsedNote,
  transform: TransformName,
  payload: TransformResultPayload
): TransformedNote {
  if (transform === 'translate_back') {
    const back = payload.back?.trim();
    if (back == null || back.length === 0) {
      throw new Error('translate_back result missing "back"');
    }
    return { ...note, back };
  }

  if (transform === 'add_example') {
    const example = payload.example?.trim();
    if (example == null || example.length === 0) {
      throw new Error('add_example result missing "example"');
    }
    return { ...note, back: appendExample(note.back, example) };
  }

  if (transform === 'cloze_front') {
    const cloze = payload.cloze?.trim();
    if (cloze == null || cloze.length === 0) {
      throw new Error('cloze_front result missing "cloze"');
    }
    return {
      ...note,
      modelKind: 'cloze',
      front: cloze,
      back: '',
    };
  }

  const hint = payload.hint?.trim();
  if (hint == null || hint.length === 0) {
    throw new Error('add_hint result missing "hint"');
  }
  return { ...note, hint };
}
