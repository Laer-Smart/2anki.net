import { MindmapData } from './MindmapData';

export interface MarkmapTreeNode {
  content: string;
  children: MarkmapTreeNode[];
  payload?: { fold?: number };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTree(
  nodeId: string,
  labelMap: Map<string, string>,
  childMap: Map<string, string[]>
): MarkmapTreeNode {
  const label = labelMap.get(nodeId) ?? nodeId;
  const childIds = childMap.get(nodeId) ?? [];
  return {
    content: escapeHtml(label),
    children: childIds.map((childId) => buildTree(childId, labelMap, childMap)),
  };
}

export function mindmapToMarkmapTree(data: MindmapData): MarkmapTreeNode | null {
  if (data.nodes.length === 0) {
    return null;
  }

  const labelMap = new Map<string, string>(data.nodes.map((n) => [n.id, n.label]));
  const childMap = new Map<string, string[]>(data.nodes.map((n) => [n.id, []]));

  for (const edge of data.edges) {
    const children = childMap.get(edge.source);
    if (children != null) {
      children.push(edge.target);
    }
  }

  const targetIds = new Set(data.edges.map((e) => e.target));
  const roots = data.nodes.filter((n) => !targetIds.has(n.id));

  if (roots.length !== 1) {
    return null;
  }

  return buildTree(roots[0].id, labelMap, childMap);
}
