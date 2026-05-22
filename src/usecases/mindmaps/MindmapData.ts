export interface MindmapData {
  nodes: Array<{ id: string; label: string; position?: { x: number; y: number } }>;
  edges: Array<{ source: string; target: string }>;
}
