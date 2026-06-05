import { NoteTypeStarter } from '../../../lib/backend/templates';

function reindexFields<T extends { ord: number }>(fields: T[]): T[] {
  return fields.map((f, i) => ({ ...f, ord: i }));
}

function uniqueFieldName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

export function renameField(
  draft: NoteTypeStarter,
  index: number,
  newName: string
): NoteTypeStarter {
  const oldName = draft.noteType.flds[index]?.name;
  if (oldName == null) return draft;
  const trimmed = newName.trim();
  if (trimmed.length === 0 || trimmed === oldName) return draft;

  const taken = new Set(
    draft.noteType.flds.filter((_, i) => i !== index).map((f) => f.name)
  );
  const finalName = taken.has(trimmed)
    ? uniqueFieldName(trimmed, taken)
    : trimmed;

  const flds = draft.noteType.flds.map((f, i) =>
    i === index ? { ...f, name: finalName } : f
  );

  const nextPreview: Record<string, string> = {};
  for (const [key, value] of Object.entries(draft.previewData)) {
    if (key === oldName) {
      nextPreview[finalName] = value;
    } else {
      nextPreview[key] = value;
    }
  }

  return {
    ...draft,
    noteType: { ...draft.noteType, flds },
    previewData: nextPreview,
  };
}

export function addField(draft: NoteTypeStarter): NoteTypeStarter {
  const taken = new Set(draft.noteType.flds.map((f) => f.name));
  const name = uniqueFieldName('New field', taken);
  const ord = draft.noteType.flds.length;
  return {
    ...draft,
    noteType: {
      ...draft.noteType,
      flds: [...draft.noteType.flds, { name, ord }],
    },
    previewData: { ...draft.previewData, [name]: '' },
  };
}

export function removeField(
  draft: NoteTypeStarter,
  index: number
): NoteTypeStarter {
  if (draft.noteType.flds.length <= 1) return draft;
  const removed = draft.noteType.flds[index];
  if (!removed) return draft;
  const flds = reindexFields(draft.noteType.flds.filter((_, i) => i !== index));
  const nextPreview: Record<string, string> = {};
  for (const [key, value] of Object.entries(draft.previewData)) {
    if (key !== removed.name) nextPreview[key] = value;
  }
  return {
    ...draft,
    noteType: { ...draft.noteType, flds },
    previewData: nextPreview,
  };
}

export function setPreviewValue(
  draft: NoteTypeStarter,
  fieldName: string,
  value: string
): NoteTypeStarter {
  return {
    ...draft,
    previewData: { ...draft.previewData, [fieldName]: value },
  };
}
