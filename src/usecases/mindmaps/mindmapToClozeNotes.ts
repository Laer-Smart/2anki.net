import Note from '../../lib/parser/Note';
import { MindmapData } from './MindmapData';

function buildChildMap(data: MindmapData): Map<string, string[]> {
  const childMap = new Map<string, string[]>();
  for (const node of data.nodes) {
    childMap.set(node.id, []);
  }
  for (const edge of data.edges) {
    const children = childMap.get(edge.source);
    if (children != null) {
      children.push(edge.target);
    }
  }
  return childMap;
}

function findRoots(data: MindmapData): string[] {
  const hasParent = new Set(data.edges.map((e) => e.target));
  return data.nodes.map((n) => n.id).filter((id) => !hasParent.has(id));
}

function collectPaths(
  nodeId: string,
  childMap: Map<string, string[]>,
  currentPath: string[]
): string[][] {
  const path = [...currentPath, nodeId];
  const children = childMap.get(nodeId) ?? [];
  if (children.length === 0) {
    return [path];
  }
  return children.flatMap((childId) => collectPaths(childId, childMap, path));
}

export function mindmapToClozeNotes(data: MindmapData): Note[] {
  if (data.nodes.length === 0 || data.edges.length === 0) {
    return [];
  }

  const nodeMap = new Map<string, string>(data.nodes.map((n) => [n.id, n.label]));
  const childMap = buildChildMap(data);
  const roots = findRoots(data);

  const allPaths = roots.flatMap((root) => collectPaths(root, childMap, []));
  const leafPaths = allPaths.filter((path) => path.length >= 2);

  return leafPaths.map((path) => {
    const parts = path.map((id, index) => {
      const label = nodeMap.get(id) ?? id;
      const isLeaf = index === path.length - 1;
      return isLeaf ? label : `{{c${index + 1}::${label}}}`;
    });
    const note = new Note(parts.join(' → '), '');
    note.cloze = true;
    return note;
  });
}
