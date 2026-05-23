import type express from 'express';
import type { AutoSuggestOcclusionsUseCase } from '../usecases/imageOcclusion/AutoSuggestOcclusionsUseCase';
import type { VisionMediaType } from '../lib/claude/countVisionTokens';

const ALLOWED_MEDIA_TYPES: VisionMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

interface RawSuggestBody {
  imageBase64?: unknown;
  mediaType?: unknown;
  width?: unknown;
  height?: unknown;
}

function isAllowedMediaType(value: unknown): value is VisionMediaType {
  return typeof value === 'string' && (ALLOWED_MEDIA_TYPES as string[]).includes(value);
}

export class AutoSuggestOcclusionsController {
  constructor(private readonly useCase: AutoSuggestOcclusionsUseCase) {}

  async suggest(req: express.Request, res: express.Response): Promise<void> {
    const body = req.body as RawSuggestBody;

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

    const width = typeof body.width === 'number' ? body.width : 512;
    const height = typeof body.height === 'number' ? body.height : 512;
    const isPaying =
      res.locals['patreon'] === true || res.locals['subscriber'] === true;
    const ownerRaw = res.locals['owner'];
    const userId =
      typeof ownerRaw === 'number'
        ? ownerRaw
        : typeof ownerRaw === 'string' && /^\d+$/.test(ownerRaw)
          ? Number(ownerRaw)
          : null;

    let result: Awaited<ReturnType<AutoSuggestOcclusionsUseCase['execute']>>;
    try {
      result = await this.useCase.execute({
        imageBase64,
        mediaType: body.mediaType,
        width,
        height,
        isPaying,
        userId,
      });
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 429) {
        res.status(429).json({ message: e.message });
        return;
      }
      if (e.status === 413) {
        res.status(413).json({ message: e.message });
        return;
      }
      throw err;
    }

    res.json({ rects: result.rects });
  }
}
