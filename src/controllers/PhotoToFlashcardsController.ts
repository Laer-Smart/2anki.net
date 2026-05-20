import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

import { PhotoToFlashcardsUseCase } from '../usecases/imageOcclusion/PhotoToFlashcardsUseCase';
import type { VisionMediaType } from '../lib/claude/countVisionTokens';
import { buildContentDisposition } from '../lib/buildContentDisposition';

const ALLOWED_MEDIA_TYPES: VisionMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface RawPhotoBody {
  imageBase64?: unknown;
  mediaType?: unknown;
  deckName?: unknown;
  width?: unknown;
  height?: unknown;
}

function isAllowedMediaType(value: unknown): value is VisionMediaType {
  return typeof value === 'string' && (ALLOWED_MEDIA_TYPES as string[]).includes(value);
}

export class PhotoToFlashcardsController {
  constructor(private readonly useCase: PhotoToFlashcardsUseCase) {}

  async create(req: express.Request, res: express.Response): Promise<void> {
    const body = req.body as RawPhotoBody;

    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    if (imageBase64.length === 0) {
      res.status(400).json({ message: 'imageBase64 is required' });
      return;
    }

    if (!isAllowedMediaType(body.mediaType)) {
      res.status(400).json({
        message: `Unsupported image type. Use ${ALLOWED_MEDIA_TYPES.join(', ')}.`,
      });
      return;
    }

    const mediaType = body.mediaType;
    const deckName =
      typeof body.deckName === 'string' && body.deckName.trim()
        ? body.deckName.trim()
        : 'Photo deck';

    const width = typeof body.width === 'number' ? body.width : 512;
    const height = typeof body.height === 'number' ? body.height : 512;

    const hasAccess = res.locals['email'] != null;

    let result: Awaited<ReturnType<PhotoToFlashcardsUseCase['execute']>>;
    try {
      result = await this.useCase.execute({
        imageBase64,
        mediaType,
        deckName,
        hasAccess,
        imageDimensions: { width, height },
      });
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 403) {
        res.status(403).json({ message: e.message });
        return;
      }
      if (e.status === 413) {
        res.status(413).json({ message: e.message });
        return;
      }
      throw err;
    }

    res.setHeader('Content-Disposition', buildContentDisposition(path.basename(result.apkgPath)));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Card-Count', String(result.cardCount));

    const stream = fs.createReadStream(result.apkgPath);
    stream.on('end', () => fs.unlink(result.apkgPath, () => undefined));
    stream.pipe(res);
  }
}
