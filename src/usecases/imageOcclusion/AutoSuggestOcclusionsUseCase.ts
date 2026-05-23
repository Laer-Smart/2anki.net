import { createHash } from 'node:crypto';
import { countVisionTokens, VISION_TOKEN_CEILING } from '../../lib/claude/countVisionTokens';
import type { VisionMediaType } from '../../lib/claude/countVisionTokens';
import type { AutoOcclusionService, SuggestedRect } from '../../services/imageOcclusion/AutoOcclusionService';
import type { IEventsRepository } from '../../data_layer/EventsRepository';
import { track } from '../../services/events/track';

export const FREE_AUTO_OCCLUSION_QUOTA_PER_MONTH = 5;
const AUTO_OCCLUSION_EVENT = 'auto_occlusion_suggested';

export interface AutoSuggestInput {
  imageBase64: string;
  mediaType: VisionMediaType;
  width: number;
  height: number;
  isPaying: boolean;
  userId: number | null;
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

function makePayloadTooLargeError(): Error & { status: number } {
  const err = new Error('Photo is too large — try a smaller or lower-resolution image') as Error & {
    status: number;
  };
  err.status = 413;
  return err;
}

function makeFreeQuotaReachedError(used: number, quota: number): Error & {
  status: number;
} {
  const err = new Error(
    `Free auto-suggest limit reached this month (${used} / ${quota}). Upgrade for unlimited.`
  ) as Error & { status: number };
  err.status = 429;
  return err;
}

function startOfMonth(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function hashImage(imageBase64: string): string {
  return createHash('sha256').update(imageBase64).digest('hex');
}

export class AutoSuggestOcclusionsUseCase {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly service: AutoOcclusionService,
    private readonly events?: IEventsRepository
  ) {}

  async execute(input: AutoSuggestInput): Promise<AutoSuggestResult> {
    if (!input.isPaying && this.events != null && input.userId != null) {
      const used = await this.events.countByNameForUser(
        AUTO_OCCLUSION_EVENT,
        startOfMonth(),
        input.userId,
        null
      );
      if (used >= FREE_AUTO_OCCLUSION_QUOTA_PER_MONTH) {
        track('auto_occlusion_quota_reached', {
          userId: input.userId,
          props: { used, quota: FREE_AUTO_OCCLUSION_QUOTA_PER_MONTH },
        });
        throw makeFreeQuotaReachedError(used, FREE_AUTO_OCCLUSION_QUOTA_PER_MONTH);
      }
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

    track(AUTO_OCCLUSION_EVENT, {
      userId: input.userId,
      props: {
        rect_count: result.rects.length,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      },
    });

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
