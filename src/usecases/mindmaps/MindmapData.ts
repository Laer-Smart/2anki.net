export interface MindmapImageMeta {
  url: string | null;
  width: number;
  height: number;
  missing?: true;
}

export interface MindmapData {
  nodes: Array<{
    id: string;
    label: string;
    position?: { x: number; y: number };
    width?: number;
    height?: number;
    color?: string | null;
    image?: MindmapImageMeta;
  }>;
  edges: Array<{ source: string; target: string }>;
}
