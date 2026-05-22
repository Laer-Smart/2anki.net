import Note from '../../lib/parser/Note';
import { MindmapData } from './MindmapData';

export function mindmapToNotes(data: MindmapData): Note[] {
  const nodeMap = new Map<string, string>(
    data.nodes.map((n) => [n.id, n.label])
  );

  const notes: Note[] = [];
  for (const edge of data.edges) {
    const parentLabel = nodeMap.get(edge.source);
    const childLabel = nodeMap.get(edge.target);
    if (parentLabel == null || childLabel == null) {
      continue;
    }
    notes.push(new Note(parentLabel, childLabel));
  }
  return notes;
}
