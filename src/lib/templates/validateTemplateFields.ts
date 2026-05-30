const ANKI_BUILTIN_TOKENS = new Set(['FrontSide']);

const FIELD_REF_PATTERN = /\{\{([^{}]+)\}\}/g;

export function extractFieldRefs(html: string): string[] {
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = FIELD_REF_PATTERN.exec(html)) !== null) {
    let name = match[1].trim();
    if (name.startsWith('#') || name.startsWith('/') || name.startsWith('^')) {
      name = name.slice(1).trim();
    }
    while (name.includes(':')) {
      name = name.slice(name.indexOf(':') + 1).trim();
    }
    if (name === '') continue;
    refs.push(name);
  }
  return refs;
}

interface CardTemplate {
  qfmt: string;
  afmt: string;
}

interface NoteField {
  name: string;
}

interface NoteTypeShape {
  tmpls: CardTemplate[];
  flds: NoteField[];
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; missing: string[]; message: string };

export function validateTemplateFields(noteType: NoteTypeShape): ValidationResult {
  const declared = new Set(noteType.flds.map((f) => f.name));
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const tmpl of noteType.tmpls) {
    const refs = extractFieldRefs(`${tmpl.qfmt}\n${tmpl.afmt}`);
    for (const ref of refs) {
      if (ANKI_BUILTIN_TOKENS.has(ref)) continue;
      if (declared.has(ref)) continue;
      if (seen.has(ref)) continue;
      seen.add(ref);
      missing.push(ref);
    }
  }
  if (missing.length === 0) return { ok: true };
  return { ok: false, missing, message: buildMessage(missing) };
}

function buildMessage(missing: string[]): string {
  if (missing.length === 1) {
    return `Template references a field that doesn't exist: ${missing[0]}. Add the field or remove the reference.`;
  }
  return `Template references fields that don't exist: ${missing.join(', ')}. Add the fields or remove the references.`;
}

export class TemplateFieldValidationError extends Error {
  readonly missing: string[];
  constructor(missing: string[], message: string) {
    super(message);
    this.name = 'TemplateFieldValidationError';
    this.missing = missing;
  }
}
