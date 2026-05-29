import { ParsedNote, TargetLanguage, TransformName } from './types';

export interface BuiltPrompt {
  system: string;
  user: string;
}

const STRIP_HTML = /<[^>]*>/g;

function plainText(value: string): string {
  return value.replace(STRIP_HTML, '').replace(/\s+/g, ' ').trim();
}

function translateBackPrompt(note: ParsedNote, language: TargetLanguage): BuiltPrompt {
  const system =
    'You translate Anki flashcard answers. Output JSON only, matching the schema {"back":"<translated answer>"}. Preserve any HTML tags from the input verbatim — only translate the human-readable text between them. Never add commentary.';
  const user = JSON.stringify({
    target_language: language,
    front: note.front,
    back: note.back,
  });
  return { system, user };
}

function addExamplePrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You write one example sentence for an Anki flashcard. Output JSON only, matching the schema {"example":"<one short example sentence>"}. The example must use the term from the front, fit on one line, and not repeat the existing back text. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(note.front),
    back: plainText(note.back),
  });
  return { system, user };
}

function clozeFrontPrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You rewrite Anki Basic notes as Cloze notes. Output JSON only, matching the schema {"cloze":"<sentence with {{c1::target}}>"}. Pick the single most-important term the learner should recall and wrap it in {{c1::...}}. The full sentence must read naturally with the cloze removed. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(note.front),
    back: plainText(note.back),
  });
  return { system, user };
}

function addHintPrompt(note: ParsedNote): BuiltPrompt {
  const system =
    'You write one short hint for an Anki flashcard. Output JSON only, matching the schema {"hint":"<short hint>"}. The hint nudges recall without giving the answer away — at most one sentence, no more than ten words. Never add commentary.';
  const user = JSON.stringify({
    front: plainText(note.front),
    back: plainText(note.back),
  });
  return { system, user };
}

export function buildTransformPrompt(
  transform: TransformName,
  note: ParsedNote,
  targetLanguage: TargetLanguage | undefined
): BuiltPrompt {
  if (transform === 'translate_back') {
    if (targetLanguage == null) {
      throw new Error('translate_back requires targetLanguage');
    }
    return translateBackPrompt(note, targetLanguage);
  }
  if (transform === 'add_example') return addExamplePrompt(note);
  if (transform === 'cloze_front') return clozeFrontPrompt(note);
  return addHintPrompt(note);
}
