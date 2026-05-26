import { MindmapData } from './MindmapData';

export interface MindmapImageRatioResult {
  total: number;
  withImages: number;
  ratio: number | null;
}

function hasImage(data: MindmapData): boolean {
  return data.nodes.some((node) => node.image != null && node.image.url != null);
}

export function mindmapImageRatio(maps: MindmapData[]): MindmapImageRatioResult {
  const total = maps.length;
  if (total === 0) {
    return { total: 0, withImages: 0, ratio: null };
  }
  const withImages = maps.filter(hasImage).length;
  const ratio = Math.round((withImages / total) * 10000) / 10000;
  return { total, withImages, ratio };
}
