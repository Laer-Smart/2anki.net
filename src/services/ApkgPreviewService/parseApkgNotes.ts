import { extractApkg } from './extractApkg';
import { parseCollection } from './parseCollection';
import { ParsedNote, SourceModelKind } from '../../lib/ankify/transforms/types';
import { NormalizedCollection } from './types';

export interface ParseApkgNotesResult {
  notes: ParsedNote[];
  unknownModelNames: string[];
  deckName: string;
}

function classifyModel(typeFlag: 0 | 1, name: string): SourceModelKind | null {
  if (typeFlag === 1) return 'cloze';
  const lower = name.toLowerCase();
  if (lower.includes('cloze')) return 'cloze';
  if (lower.includes('basic')) return 'basic';
  if (typeFlag === 0) return 'basic';
  return null;
}

function pickDeckName(collection: NormalizedCollection): string {
  const counts = new Map<number, number>();
  for (const card of collection.cards) {
    counts.set(card.did, (counts.get(card.did) ?? 0) + 1);
  }
  let bestId: number | null = null;
  let bestCount = -1;
  for (const [id, count] of counts.entries()) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  if (bestId == null) return 'Transformed deck';
  return collection.decks.get(bestId)?.name ?? 'Transformed deck';
}

function buildNote(
  noteId: number,
  collection: NormalizedCollection,
  unknownModelNames: Set<string>
): ParsedNote | null {
  const note = collection.notes.get(noteId);
  if (!note) return null;
  const model = collection.noteTypes.get(note.mid);
  if (!model) return null;
  const kind = classifyModel(model.type, model.name);
  if (kind == null) {
    unknownModelNames.add(model.name);
    return null;
  }
  const fields = note.fields;
  if (fields.length === 0) return null;
  const front = fields[0] ?? '';
  const back = fields[1] ?? '';
  return {
    guid: note.guid ?? `id-${note.id}`,
    modelKind: kind,
    front,
    back,
    tags: note.tags
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
  };
}

export async function parseApkgNotes(
  bytes: Buffer
): Promise<ParseApkgNotesResult> {
  const archive = await extractApkg(bytes);
  const collection = parseCollection(archive.collectionBuffer);
  const unknown = new Set<string>();
  const notes: ParsedNote[] = [];
  for (const id of collection.notes.keys()) {
    const built = buildNote(id, collection, unknown);
    if (built) notes.push(built);
  }
  return {
    notes,
    unknownModelNames: Array.from(unknown).sort(),
    deckName: pickDeckName(collection),
  };
}
