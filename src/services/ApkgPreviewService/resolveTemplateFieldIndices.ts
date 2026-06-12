import { NoteType } from './types';

export interface TemplateFieldIndices {
  frontFieldIndex: number;
  backFieldIndex: number;
}

const TEMPLATE_TAG = /\{\{([#^/])?([^{}]+?)\}\}/g;

const SPECIAL_NAMES = new Set([
  'FrontSide',
  'Tags',
  'Type',
  'Deck',
  'Subdeck',
  'Card',
]);

function referencedFieldOrds(
  template: string,
  ordByName: Map<string, number>
): number[] {
  const ords: number[] = [];
  TEMPLATE_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TEMPLATE_TAG.exec(template)) != null) {
    const [, sigil, rawName] = match;
    if (sigil) continue;
    const segments = rawName.split(':');
    const name = segments[segments.length - 1].trim();
    if (SPECIAL_NAMES.has(name)) continue;
    const ord = ordByName.get(name);
    if (ord != null) ords.push(ord);
  }
  return ords;
}

export function resolveTemplateFieldIndices(
  noteType: Pick<NoteType, 'fields' | 'templates'>
): TemplateFieldIndices {
  const template = [...noteType.templates].sort((a, b) => a.ord - b.ord)[0];
  if (!template) return { frontFieldIndex: 0, backFieldIndex: 1 };

  const ordByName = new Map(
    noteType.fields.map((field) => [field.name, field.ord])
  );
  const frontFieldIndex = referencedFieldOrds(template.qfmt, ordByName)[0] ?? 0;
  const backFieldIndex =
    referencedFieldOrds(template.afmt, ordByName).find(
      (ord) => ord !== frontFieldIndex
    ) ?? firstFieldOrdExcept(noteType.fields, frontFieldIndex);
  return { frontFieldIndex, backFieldIndex };
}

function firstFieldOrdExcept(
  fields: NoteType['fields'],
  excludedOrd: number
): number {
  const sorted = [...fields].sort((a, b) => a.ord - b.ord);
  const fallback = sorted.find((field) => field.ord !== excludedOrd);
  if (fallback) return fallback.ord;
  return excludedOrd === 1 ? 0 : 1;
}
