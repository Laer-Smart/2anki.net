import type {
  CancellationCommentEntry,
  CancellationReasonCount,
} from '../../data_layer/CancellationFeedbackRepository';
import type { EmojiFeedbackCommentEntry } from '../../data_layer/EmojiFeedbackRepository';
import type { ConversionOutputStatsRow } from '../../data_layer/ConversionOutputStatsRepository';
import type { ConversionErrorCount } from './ConversionMetricsService';
import {
  CancellationSignalSource,
  CustomerSignalsService,
  EmojiSignalSource,
  EmptyBackSignalSource,
  FailedConversionSignalSource,
} from './CustomerSignalsService';

interface FakeSources {
  cancelReasons?: CancellationReasonCount[];
  cancelComments?: CancellationCommentEntry[];
  emojiComments?: EmojiFeedbackCommentEntry[];
  failureReasons?: ConversionErrorCount[];
  emptyBack?: ConversionOutputStatsRow[];
  throwOn?: 'cancellation' | 'emoji' | 'failedConversion' | 'emptyBack';
}

function buildService(sources: FakeSources): CustomerSignalsService {
  const cancellation: CancellationSignalSource = {
    countByReason: async () => {
      if (sources.throwOn === 'cancellation') throw new Error('cancel down');
      return sources.cancelReasons ?? [];
    },
    recentComments: async () => sources.cancelComments ?? [],
  };
  const emoji: EmojiSignalSource = {
    recentComments: async () => {
      if (sources.throwOn === 'emoji') throw new Error('emoji down');
      return sources.emojiComments ?? [];
    },
  };
  const failedConversion: FailedConversionSignalSource = {
    topFailureReasons7d: async () => {
      if (sources.throwOn === 'failedConversion') throw new Error('jobs down');
      return sources.failureReasons ?? [];
    },
  };
  const emptyBack: EmptyBackSignalSource = {
    list: async () => {
      if (sources.throwOn === 'emptyBack') throw new Error('stats down');
      return sources.emptyBack ?? [];
    },
  };
  return new CustomerSignalsService({
    cancellation,
    emoji,
    failedConversion,
    emptyBack,
  });
}

const statsRow = (
  source: string,
  emptyBack: number
): ConversionOutputStatsRow => ({
  source,
  decks: 1,
  cards: 100,
  empty_back_cards: emptyBack,
  first_seen: '2026-01-01T00:00:00.000Z',
  last_seen: '2026-07-01T00:00:00.000Z',
});

describe('CustomerSignalsService', () => {
  const since = new Date('2026-06-01T00:00:00.000Z');

  it('ranks structured signals by count desc and maps buckets', async () => {
    const service = buildService({
      cancelReasons: [
        { reason: 'too expensive', count: 4 },
        { reason: 'finished what I needed', count: 9 },
      ],
      failureReasons: [{ reason: 'Notion export unreadable', count: 12 }],
      emptyBack: [statsRow('notion', 30), statsRow('upload', 7)],
    });

    const result = await service.getSignals(since);

    expect(result.error).toBeUndefined();
    expect(result.since).toBe('2026-06-01T00:00:00.000Z');
    expect(result.signals).toEqual([
      {
        source: 'empty_back',
        label: 'Cards generated with an empty back (all-time)',
        count: 37,
        bucket: 'pain-killer',
      },
      {
        source: 'failed_conversion',
        label: 'Notion export unreadable',
        count: 12,
        bucket: 'pain-killer',
      },
      {
        source: 'cancel_reason',
        label: 'finished what I needed',
        count: 9,
        bucket: 'unknown',
      },
      {
        source: 'cancel_reason',
        label: 'too expensive',
        count: 4,
        bucket: 'unknown',
      },
    ]);
  });

  it('returns truncated verbatim quotes for free-text sources within the window', async () => {
    const longComment = 'x'.repeat(250);
    const service = buildService({
      cancelComments: [
        {
          reason: 'too expensive',
          comment: 'wish it were cheaper for students',
          created_at: '2026-06-15T00:00:00.000Z',
        },
        {
          reason: 'don’t use enough',
          comment: 'stale one',
          created_at: '2026-05-01T00:00:00.000Z',
        },
      ],
      emojiComments: [
        {
          rating: 2,
          comment: longComment,
          page: 'Biochem',
          created_at: '2026-06-20T00:00:00.000Z',
        },
      ],
    });

    const result = await service.getSignals(since);

    const cancelComment = result.signals?.find(
      (row) => row.source === 'cancel_comment'
    );
    expect(cancelComment).toEqual({
      source: 'cancel_comment',
      label: 'too expensive',
      count: 1,
      bucket: 'unknown',
      sampleQuote: 'wish it were cheaper for students',
    });

    const emojiComment = result.signals?.find(
      (row) => row.source === 'emoji_feedback'
    );
    expect(emojiComment?.sampleQuote).toHaveLength(200);
    expect(emojiComment?.sampleQuote?.endsWith('…')).toBe(true);
    expect(emojiComment?.label).toBe('Deck-ready rating 2');
  });

  it('drops free-text comments older than the window', async () => {
    const service = buildService({
      cancelComments: [
        {
          reason: 'too expensive',
          comment: 'old feedback',
          created_at: '2026-05-01T00:00:00.000Z',
        },
      ],
    });

    const result = await service.getSignals(since);

    expect(result.signals?.some((row) => row.source === 'cancel_comment')).toBe(
      false
    );
  });

  it('omits the empty-back row when no empty backs exist', async () => {
    const service = buildService({ emptyBack: [statsRow('notion', 0)] });

    const result = await service.getSignals(since);

    expect(result.signals?.some((row) => row.source === 'empty_back')).toBe(
      false
    );
  });

  it('returns a null list and the error message when a source throws', async () => {
    const service = buildService({ throwOn: 'failedConversion' });

    const result = await service.getSignals(since);

    expect(result.signals).toBeNull();
    expect(result.error).toBe('jobs down');
  });
});
