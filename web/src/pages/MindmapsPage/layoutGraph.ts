import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 36;
const COMPONENT_GAP = 80;

function buildGraph(nodes: Node[], edges: Edge[]): dagre.graphlib.Graph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 });
  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  return g;
}

function layoutComponent(
  componentIds: string[],
  fullGraph: dagre.graphlib.Graph,
): Map<string, { x: number; y: number }> {
  const sub = new dagre.graphlib.Graph();
  sub.setDefaultEdgeLabel(() => ({}));
  sub.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 });
  for (const id of componentIds) {
    sub.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of fullGraph.edges()) {
    if (componentIds.includes(edge.v) && componentIds.includes(edge.w)) {
      sub.setEdge(edge.v, edge.w);
    }
  }
  dagre.layout(sub);
  const positions = new Map<string, { x: number; y: number }>();
  for (const id of componentIds) {
    const pos = sub.node(id);
    positions.set(id, { x: pos.x, y: pos.y });
  }
  return positions;
}

export function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const fullGraph = buildGraph(nodes, edges);
  const components = dagre.graphlib.alg.components(fullGraph);

  const positionById = new Map<string, { x: number; y: number }>();
  let xOffset = 0;

  for (const componentIds of components) {
    const localPositions = layoutComponent(componentIds, fullGraph);

    let minX = Infinity;
    let maxX = -Infinity;
    for (const pos of Array.from(localPositions.values())) {
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
    }
    const componentWidth = maxX - minX + NODE_WIDTH;

    for (const [id, pos] of Array.from(localPositions)) {
      positionById.set(id, { x: pos.x - minX + xOffset, y: pos.y });
    }

    xOffset += componentWidth + COMPONENT_GAP;
  }

  return nodes.map((node) => {
    const pos = positionById.get(node.id) ?? { x: 0, y: 0 };
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}
