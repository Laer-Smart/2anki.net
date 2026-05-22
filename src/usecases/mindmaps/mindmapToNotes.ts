import Note from '../../lib/parser/Note';
import { MindmapData } from './MindmapData';

function buildNodeBack(
  label: string,
  imageUrl: string | undefined,
  filenameMap: Record<string, string>
): string {
  if (imageUrl == null) return label;
  const filename = imageUrl.split('/').pop() ?? '';
  const mapped = filenameMap[filename];
  if (mapped == null) return label;
  const imgTag = `<img src="${mapped}" alt="${label}" style="max-width:100%;height:auto;">`;
  return label.length > 0 ? `${imgTag}<br>${label}` : imgTag;
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

    const front = buildNodeBack(parentNode.label, parentNode.image?.url, filenameMap);
    const back = buildNodeBack(childNode.label, childNode.image?.url, filenameMap);

    notes.push(new Note(front, back));
  }
  return notes;
}
