import { createHash } from 'node:crypto';
import { countVisionTokens, VISION_TOKEN_CEILING } from '../../lib/claude/countVisionTokens';
import type { VisionMediaType } from '../../lib/claude/countVisionTokens';
import type { AutoOcclusionService, SuggestedRect } from '../../services/imageOcclusion/AutoOcclusionService';

export interface AutoSuggestInput {
  imageBase64: string;
  mediaType: VisionMediaType;
  width: number;
  height: number;
  hasAccess: boolean;
}

export interface AutoSuggestResult {
  rects: SuggestedRect[];
  inputTokens: number;
  outputTokens: number;
  fromCache: boolean;
}

interface CacheEntry {
  result: AutoSuggestResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function makeAccessError(): Error & { status: number } {
  const err = new Error('Auto Sync access required') as Error & { status: number };
  err.status = 403;
  return err;
}

function makePayloadTooLargeError(): Error & { status: number } {
  const err = new Error('Photo is too large — try a smaller or lower-resolution image') as Error & {
    status: number;
  };
  err.status = 413;
  return err;
}

function hashImage(imageBase64: string): string {
  return createHash('sha256').update(imageBase64).digest('hex');
}

export class AutoSuggestOcclusionsUseCase {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly service: AutoOcclusionService) {}

  async execute(input: AutoSuggestInput): Promise<AutoSuggestResult> {
    if (!input.hasAccess) {
      throw makeAccessError();
    }

    const { tokens } = countVisionTokens({
      width: input.width,
      height: input.height,
      mediaType: input.mediaType,
    });

    if (tokens > VISION_TOKEN_CEILING) {
      throw makePayloadTooLargeError();
    }

    const cacheKey = hashImage(input.imageBase64);
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached != null && cached.expiresAt > now) {
      return { ...cached.result, fromCache: true };
    }

    const serviceResult = await this.service.suggest({
      imageBase64: input.imageBase64,
      mediaType: input.mediaType,
      width: input.width,
      height: input.height,
    });

    const result: AutoSuggestResult = {
      rects: serviceResult.rects,
      inputTokens: serviceResult.inputTokens,
      outputTokens: serviceResult.outputTokens,
      fromCache: false,
    };

    this.cache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });

    console.log(
      JSON.stringify({
        event: 'auto_occlusion_call_success',
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        rect_count: result.rects.length,
        from_cache: false,
      })
    );

    return result;
  }
}
