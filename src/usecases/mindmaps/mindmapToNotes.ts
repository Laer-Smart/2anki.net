import Note from '../../lib/parser/Note';
import { MindmapData } from './MindmapData';

function buildNodeBack(
  label: string,
  imageUrl: string | undefined,
  filenameMap: Record<string, string>
): { html: string; media: string | null } {
  if (imageUrl == null) return { html: label, media: null };
  const filename = imageUrl.split('/').pop() ?? '';
  const mapped = filenameMap[filename];
  if (mapped == null) return { html: label, media: null };
  const imgTag = `<img src="${mapped}" alt="${label}" style="max-width:100%;height:auto;">`;
  return {
    html: label.length > 0 ? `${imgTag}<br>${label}` : imgTag,
    media: mapped,
  };
}

export function mindmapToNotes(
  data: MindmapData,
  filenameMap: Record<string, string> = {}
): Note[] {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  const notes: Note[] = [];
  for (const edge of data.edges) {
    const parentNode = nodeMap.get(edge.source);
    const childNode = nodeMap.get(edge.target);
    if (parentNode == null || childNode == null) continue;

    const front = buildNodeBack(parentNode.label, parentNode.image?.url ?? undefined, filenameMap);
    const back = buildNodeBack(childNode.label, childNode.image?.url ?? undefined, filenameMap);

    const note = new Note(front.html, back.html);
    const media = [front.media, back.media].filter((m): m is string => m != null);
    if (media.length > 0) note.media = media;
    notes.push(note);
  }
  return notes;
}
