export interface MindmapData {
  nodes: Array<{
    id: string;
    label: string;
    position?: { x: number; y: number };
    width?: number;
    height?: number;
    color?: string | null;
  }>;
  edges: Array<{ source: string; target: string }>;
}
