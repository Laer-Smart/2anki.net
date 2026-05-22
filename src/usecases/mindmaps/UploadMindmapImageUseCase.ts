import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import imageSize from 'image-size';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export class MindmapImageTooLargeError extends Error {
  constructor() {
    super('Image exceeds the 5 MB limit');
    this.name = 'MindmapImageTooLargeError';
  }
}

export class MindmapImageTypeError extends Error {
  constructor() {
    super('Only PNG, JPEG, GIF, and WebP images are accepted');
    this.name = 'MindmapImageTypeError';
  }
}

interface UploadInput {
  userId: string;
  mapId: string;
  file: {
    path: string;
    mimetype: string;
    size: number;
  };
}

export interface MindmapImageResult {
  url: string;
  width: number;
  height: number;
}

export class UploadMindmapImageUseCase {
  constructor(private readonly uploadBase: string) {}

  async execute(input: UploadInput): Promise<MindmapImageResult> {
    const { userId, mapId, file } = input;

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new MindmapImageTypeError();
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new MindmapImageTooLargeError();
    }

    const ext = this.extensionFor(file.mimetype);
    const filename = `${randomUUID()}${ext}`;
    const destDir = path.join(this.uploadBase, 'mindmaps', userId, mapId);
    fs.mkdirSync(destDir, { recursive: true });

    const destPath = path.join(destDir, filename);
    const assertedPath = path.resolve(destPath);
    const assertedBase = path.resolve(destDir);
    if (!assertedPath.startsWith(assertedBase + path.sep)) {
      throw new Error('Path escape detected');
    }

    fs.copyFileSync(file.path, destPath);
    fs.unlinkSync(file.path);

    const buf = fs.readFileSync(destPath);
    const dims = imageSize(buf);

    return {
      url: `/api/mindmaps/images/${userId}/${mapId}/${filename}`,
      width: dims.width ?? 0,
      height: dims.height ?? 0,
    };
  }

  private extensionFor(mimetype: string): string {
    switch (mimetype) {
      case 'image/png': return '.png';
      case 'image/jpeg': return '.jpg';
      case 'image/gif': return '.gif';
      case 'image/webp': return '.webp';
      default: return '.bin';
    }
  }
}
