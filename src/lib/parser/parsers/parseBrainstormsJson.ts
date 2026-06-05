import { MindmapData } from '../../../usecases/mindmaps/MindmapData';

interface RawNode {
  id: string;
  label: string;
}

interface RawEdge {
  source: string;
  target: string;
}

interface RawGraph {
  nodes: RawNode[];
  edges: RawEdge[];
}

function assertShape(value: unknown): asserts value is RawGraph {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Brainstorms JSON must be an object');
  }
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v['nodes'])) {
    throw new Error('Brainstorms JSON missing "nodes" array');
  }
  if (!Array.isArray(v['edges'])) {
    throw new Error('Brainstorms JSON missing "edges" array');
  }
}

export function parseBrainstormsJson(text: string): MindmapData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Brainstorms JSON is not valid JSON');
  }
  assertShape(parsed);
  return {
    nodes: parsed.nodes.map((n) => ({
      id: String(n.id),
      label: String(n.label),
    })),
    edges: parsed.edges.map((e) => ({
      source: String(e.source),
      target: String(e.target),
    })),
  };
}
