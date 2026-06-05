import { normalizeFailureReasons } from './normalizeFailureReasons';
import { EMPTY_DECK_FAILURE_REASON } from '../usecases/jobs/jobFailureReason';

describe('normalizeFailureReasons', () => {
  it('excludes monthly_limit quota blocks entirely', () => {
    const result = normalizeFailureReasons([
      {
        reason: JSON.stringify({
          code: 'monthly_limit',
          cards_used: 91,
          limit: 100,
        }),
        count: 5,
      },
    ]);

    expect(result).toEqual([]);
  });

  it('uses the code field from a JSON blob with a code', () => {
    const result = normalizeFailureReasons([
      { reason: JSON.stringify({ code: 'timeout' }), count: 3 },
    ]);

    expect(result).toEqual([{ reason: 'timeout', count: 3 }]);
  });

  it('buckets the empty-deck prose message to empty_deck', () => {
    const result = normalizeFailureReasons([
      {
        reason: EMPTY_DECK_FAILURE_REASON,
        count: 4,
      },
    ]);

    expect(result).toEqual([{ reason: 'empty_deck', count: 4 }]);
  });

  it('passes a short plain string through unchanged', () => {
    const result = normalizeFailureReasons([
      { reason: 'notion_token_expired', count: 2 },
    ]);

    expect(result).toEqual([{ reason: 'notion_token_expired', count: 2 }]);
  });

  it('re-aggregates counts across rows that normalize to the same code', () => {
    const result = normalizeFailureReasons([
      { reason: JSON.stringify({ code: 'timeout', detail: 'a' }), count: 2 },
      { reason: JSON.stringify({ code: 'timeout', detail: 'b' }), count: 3 },
    ]);

    expect(result).toEqual([{ reason: 'timeout', count: 5 }]);
  });

  it('sorts by count descending and limits to 10 reasons', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      reason: `reason_${i}`,
      count: i + 1,
    }));

    const result = normalizeFailureReasons(rows);

    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({ reason: 'reason_11', count: 12 });
    expect(result.map((r) => r.reason)).not.toContain('reason_0');
  });

  it('buckets long prose to a stable stem so variants merge', () => {
    const longProse =
      'Something went wrong on our end converting this file. Job ID 123. Check status at 2anki.net/status.';
    const longProseOther =
      'Something went wrong on our end converting this file. Job ID 456. Check status at 2anki.net/status.';

    const result = normalizeFailureReasons([
      { reason: longProse, count: 2 },
      { reason: longProseOther, count: 3 },
    ]);

    expect(result).toEqual([
      { reason: 'Something went wrong on our end converti…', count: 5 },
    ]);
  });
});
