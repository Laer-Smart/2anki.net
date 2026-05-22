import fs from 'node:fs';
import path from 'node:path';

import { MindmapData } from './MindmapData';

export interface CollectedImage {
  filename: string;
  buffer: Buffer;
}

export function collectMindmapImages(
  data: MindmapData,
  uploadBase: string
): CollectedImage[] {
  const seen = new Set<string>();
  const result: CollectedImage[] = [];

  for (const node of data.nodes) {
    const { image } = node;
    if (image == null) continue;
    if (seen.has(image.url)) continue;
    seen.add(image.url);

    const filename = image.url.split('/').pop() ?? '';
    const relPath = image.url.replace('/api/mindmaps/images/', '');
    const diskPath = path.join(uploadBase, 'mindmaps', relPath);

    if (!fs.existsSync(diskPath)) continue;

    const buffer = fs.readFileSync(diskPath);
    result.push({ filename, buffer });
  }

  return result;
}
