export interface OcclusionRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  shape: 'rect' | 'ellipse' | 'polygon';
  points?: { x: number; y: number }[];
  groupId?: string;
  source?: 'auto' | 'manual';
  confidence?: number;
}

export interface ImageEntry {
  id: string;
  file: File | null;
  imageName: string;
  header: string;
  rects: OcclusionRect[];
  previewUrl: string;
  s3Key: string | null;
  uploading: boolean;
}
