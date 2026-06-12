import { TemplateFile } from '../types';

const STORAGE_KEY_BY_BASE_TYPE: Record<string, string> = {
  basic: 'n2a-basic',
  cloze: 'n2a-cloze',
  input: 'n2a-input',
};

interface SavedCardTemplate {
  qfmt?: unknown;
  afmt?: unknown;
}

interface SavedNoteType {
  tmpls?: SavedCardTemplate[];
  css?: unknown;
}

interface SavedNoteTypeEntry {
  name?: unknown;
  baseType?: unknown;
  noteType?: SavedNoteType;
}

function isTemplateFile(entry: unknown): entry is TemplateFile {
  if (entry == null || typeof entry !== 'object') {
    return false;
  }
  const candidate = entry as Partial<TemplateFile>;
  return (
    typeof candidate.storageKey === 'string' &&
    typeof candidate.front === 'string' &&
    typeof candidate.back === 'string'
  );
}

function fromSavedNoteType(entry: unknown): TemplateFile | null {
  if (entry == null || typeof entry !== 'object') {
    return null;
  }
  const candidate = entry as SavedNoteTypeEntry;
  const storageKey =
    typeof candidate.baseType === 'string'
      ? STORAGE_KEY_BY_BASE_TYPE[candidate.baseType]
      : undefined;
  if (storageKey == null) {
    return null;
  }
  const card = candidate.noteType?.tmpls?.[0];
  if (
    card == null ||
    typeof card.qfmt !== 'string' ||
    typeof card.afmt !== 'string'
  ) {
    return null;
  }
  return {
    parent: '',
    name: typeof candidate.name === 'string' ? candidate.name : '',
    front: card.qfmt,
    back: card.afmt,
    styling:
      typeof candidate.noteType?.css === 'string' ? candidate.noteType.css : '',
    storageKey,
  };
}

/**
 * The templates column holds two payload shapes: the legacy template editor
 * saved a bare TemplateFile[] keyed by storageKey, while the note-type editor
 * saves { templates: [{ name, baseType, noteType }], hiddenIds }. Both must
 * resolve, or custom note types silently fall back to the defaults.
 */
export function normalizeStoredTemplates(payload: unknown): TemplateFile[] {
  let entries: unknown[];
  if (Array.isArray(payload)) {
    entries = payload;
  } else {
    const wrapped = (payload as { templates?: unknown } | null)?.templates;
    entries = Array.isArray(wrapped) ? wrapped : [];
  }
  return entries
    .map((entry) => (isTemplateFile(entry) ? entry : fromSavedNoteType(entry)))
    .filter((entry): entry is TemplateFile => entry != null);
}

export function pickCustomTemplate(
  templates: TemplateFile[],
  storageKey: string,
  preferredName?: string
): TemplateFile | null {
  const candidates = templates.filter((tm) => tm.storageKey === storageKey);
  const namedMatch = candidates.find((tm) => tm.name === preferredName);
  return namedMatch ?? candidates[0] ?? null;
}
