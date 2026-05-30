import {
  FieldSelection,
  getBackField,
  getFrontField,
  ParsedNote,
  TargetLanguage,
  TransformName,
} from './types';

export interface BuiltPrompt {
  system: string;
  user: string;
}

const STRIP_HTML = /<[^>]{0,1024}>/g;

function plainText(value: string): string {
  return value.replace(STRIP_HTML, '').replace(/\s+/g, ' ').trim();
}

const sourceValue = (note: ParsedNote, selection: FieldSelection): string => {
  const idx = selection.sourceField;
  if (idx == null) return getBackField(note);
  return note.fields[idx] ?? '';
};

function translateBackPrompt(
  note: ParsedNote,
  language: TargetLanguage,
  selection: FieldSelection
): BuiltPrompt {
  const system =
    'You translate Anki flashcard fields. Output JSON only, matching the schema {"value":"<translated text>"}. Preserve any HTML tags from the input verbatim — only translate the human-readable text between them. Never add commentary.';
  const user = JSON.stringify({
    target_language: language,
    field_to_translate: sourceValue(note, selection),
    context_front: getFrontField(note),
  });
  return { system, user };
}

function addExamplePrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You write one example sentence for an Anki flashcard. Output JSON only, matching the schema {"example":"<one short example sentence>"}. The example must use the term from the front, fit on one line, and not repeat the existing back text. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(getFrontField(note)),
    back: plainText(getBackField(note)),
  });
  return { system, user };
}

function clozeFrontPrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You rewrite Anki Basic notes as Cloze notes. Output JSON only, matching the schema {"cloze":"<sentence with {{c1::target}}>"}. Pick the single most-important term the learner should recall and wrap it in {{c1::...}}. The full sentence must read naturally with the cloze removed. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(getFrontField(note)),
    back: plainText(getBackField(note)),
  });
  return { system, user };
}

function addHintPrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You write one short hint for an Anki flashcard. Output JSON only, matching the schema {"hint":"<short hint>"}. The hint nudges recall without giving the answer away — at most one sentence, no more than ten words. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(getFrontField(note)),
    back: plainText(getBackField(note)),
  });
  return { system, user };
}

export function buildTransformPrompt(
  transform: TransformName,
  note: ParsedNote,
  targetLanguage: TargetLanguage | undefined,
  selection: FieldSelection = {}
): BuiltPrompt {
  if (transform === 'translate_back') {
    if (targetLanguage == null) {
      throw new Error('translate_back requires targetLanguage');
    }
    return translateBackPrompt(note, targetLanguage, selection);
  }
  if (transform === 'add_example') return addExamplePrompt(note);
  if (transform === 'cloze_front') return clozeFrontPrompt(note);
  return addHintPrompt(note);
}
