export interface MindmapData {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
}
