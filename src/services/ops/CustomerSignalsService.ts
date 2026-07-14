import type {
  CancellationCommentEntry,
  CancellationReasonCount,
} from '../../data_layer/CancellationFeedbackRepository';
import type { EmojiFeedbackCommentEntry } from '../../data_layer/EmojiFeedbackRepository';
import type { ConversionOutputStatsRow } from '../../data_layer/ConversionOutputStatsRepository';
import type { ConversionErrorCount } from './ConversionMetricsService';

export type CustomerSignalSource =
  | 'cancel_reason'
  | 'cancel_comment'
  | 'emoji_feedback'
  | 'failed_conversion'
  | 'empty_back';

export type CustomerSignalBucket =
  | 'pain-killer'
  | 'money-multiplier'
  | 'unknown';

export interface CustomerSignalRow {
  source: CustomerSignalSource;
  label: string;
  count: number;
  bucket: CustomerSignalBucket;
  sampleQuote?: string;
}

export interface CustomerSignalsResponse {
  signals: CustomerSignalRow[] | null;
  since: string;
  as_of: string;
  error?: string;
}

export interface CancellationSignalSource {
  countByReason(since: Date): Promise<CancellationReasonCount[]>;
  recentComments(limit: number): Promise<CancellationCommentEntry[]>;
}

export interface EmojiSignalSource {
  recentComments(limit: number): Promise<EmojiFeedbackCommentEntry[]>;
}

export interface FailedConversionSignalSource {
  topFailureReasons7d(since: Date): Promise<ConversionErrorCount[]>;
}

export interface EmptyBackSignalSource {
  list(): Promise<ConversionOutputStatsRow[]>;
}

interface CustomerSignalsServiceDeps {
  cancellation: CancellationSignalSource;
  emoji: EmojiSignalSource;
  failedConversion: FailedConversionSignalSource;
  emptyBack: EmptyBackSignalSource;
}

const SAMPLE_LIMIT = 10;
const COMMENT_FETCH_LIMIT = 100;
const QUOTE_MAX_LENGTH = 200;
const ELLIPSIS = '…';

function truncateQuote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= QUOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}${ELLIPSIS}`;
}

function withinWindow(createdAt: string, since: Date): boolean {
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() >= since.getTime();
}

export class CustomerSignalsService {
  private readonly cancellation: CancellationSignalSource;
  private readonly emoji: EmojiSignalSource;
  private readonly failedConversion: FailedConversionSignalSource;
  private readonly emptyBack: EmptyBackSignalSource;

  constructor(deps: CustomerSignalsServiceDeps) {
    this.cancellation = deps.cancellation;
    this.emoji = deps.emoji;
    this.failedConversion = deps.failedConversion;
    this.emptyBack = deps.emptyBack;
  }

  async getSignals(since: Date): Promise<CustomerSignalsResponse> {
    const as_of = new Date().toISOString();
    const sinceStr = since.toISOString();

    try {
      const rows = await this.collectRows(since);
      const signals = rows.sort((a, b) => b.count - a.count);
      return { signals, since: sinceStr, as_of };
    } catch (err) {
      return {
        signals: null,
        since: sinceStr,
        as_of,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async collectRows(since: Date): Promise<CustomerSignalRow[]> {
    const [
      cancelReasons,
      cancelComments,
      emojiComments,
      failureReasons,
      emptyBackStats,
    ] = await Promise.all([
      this.cancellation.countByReason(since),
      this.cancellation.recentComments(COMMENT_FETCH_LIMIT),
      this.emoji.recentComments(COMMENT_FETCH_LIMIT),
      this.failedConversion.topFailureReasons7d(since),
      this.emptyBack.list(),
    ]);

    return [
      ...toCancelReasonRows(cancelReasons),
      ...toFailedConversionRows(failureReasons),
      ...toEmptyBackRows(emptyBackStats),
      ...toCancelCommentRows(cancelComments, since),
      ...toEmojiCommentRows(emojiComments, since),
    ];
  }
}

function toCancelReasonRows(
  reasons: CancellationReasonCount[]
): CustomerSignalRow[] {
  return reasons.map((row) => ({
    source: 'cancel_reason' as const,
    label: row.reason,
    count: row.count,
    bucket: 'unknown' as const,
  }));
}

function toFailedConversionRows(
  reasons: ConversionErrorCount[]
): CustomerSignalRow[] {
  return reasons.map((row) => ({
    source: 'failed_conversion' as const,
    label: row.reason,
    count: row.count,
    bucket: 'pain-killer' as const,
  }));
}

function toEmptyBackRows(
  stats: ConversionOutputStatsRow[]
): CustomerSignalRow[] {
  const total = stats.reduce((sum, row) => sum + row.empty_back_cards, 0);
  if (total <= 0) return [];
  return [
    {
      source: 'empty_back' as const,
      label: 'Cards generated with an empty back (all-time)',
      count: total,
      bucket: 'pain-killer' as const,
    },
  ];
}

function toCancelCommentRows(
  comments: CancellationCommentEntry[],
  since: Date
): CustomerSignalRow[] {
  return comments
    .filter((row) => withinWindow(row.created_at, since))
    .slice(0, SAMPLE_LIMIT)
    .map((row) => ({
      source: 'cancel_comment' as const,
      label: row.reason,
      count: 1,
      bucket: 'unknown' as const,
      sampleQuote: truncateQuote(row.comment),
    }));
}

function toEmojiCommentRows(
  comments: EmojiFeedbackCommentEntry[],
  since: Date
): CustomerSignalRow[] {
  return comments
    .filter((row) => withinWindow(row.created_at, since))
    .slice(0, SAMPLE_LIMIT)
    .map((row) => ({
      source: 'emoji_feedback' as const,
      label: `Deck-ready rating ${row.rating}`,
      count: 1,
      bucket: 'unknown' as const,
      sampleQuote: truncateQuote(row.comment),
    }));
}
