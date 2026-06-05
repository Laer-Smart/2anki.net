import { MindmapData } from './MindmapData';
import { escapeHtml } from './escapeHtml';

export interface MarkmapTreeNode {
  content: string;
  children: MarkmapTreeNode[];
  payload?: { fold?: number };
}

function buildNodeContent(
  nodeId: string,
  labelMap: Map<string, string>,
  imageUrlMap: Map<string, string | undefined>,
  filenameMap: Record<string, string>
): string {
  const label = labelMap.get(nodeId) ?? nodeId;
  const imageUrl = imageUrlMap.get(nodeId);
  if (imageUrl == null) return escapeHtml(label);

  const filename = imageUrl.split('/').pop() ?? '';
  const mapped = filenameMap[filename];
  if (mapped == null) return escapeHtml(label);

  const imgTag = `<img src="${mapped}" alt="${escapeHtml(label)}" style="max-width:100%;height:auto;">`;
  return label.length > 0 ? `${imgTag}<br>${escapeHtml(label)}` : imgTag;
}

function buildTree(
  nodeId: string,
  labelMap: Map<string, string>,
  imageUrlMap: Map<string, string | undefined>,
  childMap: Map<string, string[]>,
  filenameMap: Record<string, string>
): MarkmapTreeNode {
  const content = buildNodeContent(nodeId, labelMap, imageUrlMap, filenameMap);
  const childIds = childMap.get(nodeId) ?? [];
  return {
    content,
    children: childIds.map((childId) =>
      buildTree(childId, labelMap, imageUrlMap, childMap, filenameMap)
    ),
  };
}

export function mindmapToMarkmapTree(
  data: MindmapData,
  filenameMap: Record<string, string> = {}
): MarkmapTreeNode | null {
  if (data.nodes.length === 0) {
    return null;
  }

  const labelMap = new Map<string, string>(
    data.nodes.map((n) => [n.id, n.label])
  );
  const imageUrlMap = new Map<string, string | undefined>(
    data.nodes.map((n) => [n.id, n.image?.url ?? undefined])
  );
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

  return buildTree(roots[0].id, labelMap, imageUrlMap, childMap, filenameMap);
}
