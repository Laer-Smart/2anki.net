import { TransformedNote } from './types';

const IMG_SRC = /<img\b[^>]{0,1024}\bsrc\s*=\s*["']([^"']{1,1024})["']/gi;

function extractFilenames(
  fields: readonly string[],
  known: ReadonlySet<string>
): string[] {
  const found = new Set<string>();
  for (const field of fields) {
    if (typeof field !== 'string' || field.length === 0) continue;
    IMG_SRC.lastIndex = 0;
    let match: RegExpExecArray | null = IMG_SRC.exec(field);
    while (match != null) {
      const filename = match[1];
      if (known.has(filename)) found.add(filename);
      match = IMG_SRC.exec(field);
    }
  }
  return Array.from(found);
}

export function attachReferencedMedia(
  notes: readonly TransformedNote[],
  knownFilenames: ReadonlySet<string>
): TransformedNote[] {
  if (knownFilenames.size === 0) return notes.map((n) => ({ ...n }));
  return notes.map((note) => {
    const referenced = extractFilenames(note.fields, knownFilenames);
    if (referenced.length === 0) return { ...note };
    const existing = note.media ?? [];
    const merged = Array.from(new Set([...existing, ...referenced]));
    return { ...note, media: merged };
  });
}
