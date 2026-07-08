import { describe, expect, it } from 'vitest';

import { FailedPaymentsWeekPoint } from './businessTypes';
import { ErrorGroup } from './errorsTypes';
import {
  WeeklyRatePoint,
  computeTodaySignals,
  evaluateConversionSuccess,
  evaluateFailedPaymentsSpike,
  evaluateFunnelDrop,
  evaluateUnresolvedErrors,
} from './todaySignals';

const buildErrorGroup = (overrides: Partial<ErrorGroup> = {}): ErrorGroup => ({
  message_hash: 'abc',
  message: 'TypeError: x is undefined',
  stack: null,
  url: null,
  release: null,
  source: 'server',
  user_id: null,
  user_agent: null,
  first_seen: '2026-07-01T00:00:00Z',
  last_seen: '2026-07-06T00:00:00Z',
  occurrences: 3,
  resolved: false,
  resolved_at: null,
  ...overrides,
});

const weeks = (counts: number[]): FailedPaymentsWeekPoint[] =>
  counts.map((count, i) => ({
    week: `2026-06-${String(i + 1).padStart(2, '0')}`,
    count,
  }));

const rates = (values: number[]): WeeklyRatePoint[] =>
  values.map((rate, i) => ({
    week: `2026-06-${String(i + 1).padStart(2, '0')}`,
    rate,
  }));

describe('evaluateUnresolvedErrors', () => {
  it('does not fire on empty or nullish input', () => {
    expect(evaluateUnresolvedErrors([])).toBeNull();
    expect(evaluateUnresolvedErrors(null)).toBeNull();
    expect(evaluateUnresolvedErrors(undefined)).toBeNull();
  });

  it('fires urgent when any unresolved group is present', () => {
    const signal = evaluateUnresolvedErrors([
      buildErrorGroup({ occurrences: 4 }),
      buildErrorGroup({ occurrences: 6, message_hash: 'def' }),
    ]);
    expect(signal).toMatchObject({
      id: 'unresolved-errors',
      severity: 'urgent',
      value: '2',
      delta: '10 occurrences',
    });
  });
});

describe('evaluateFailedPaymentsSpike', () => {
  it('does not fire with fewer than two weeks', () => {
    expect(evaluateFailedPaymentsSpike(weeks([9]))).toBeNull();
    expect(evaluateFailedPaymentsSpike(null)).toBeNull();
  });

  it('does not fire when latest equals exactly 2x the prior average', () => {
    expect(evaluateFailedPaymentsSpike(weeks([2, 2, 2, 4]))).toBeNull();
  });

  it('fires urgent when latest exceeds 2x the prior average', () => {
    const signal = evaluateFailedPaymentsSpike(weeks([2, 2, 2, 5]));
    expect(signal).toMatchObject({
      id: 'failed-payments-spike',
      severity: 'urgent',
      value: '5',
    });
  });

  it('does not fire when the prior average is zero', () => {
    expect(evaluateFailedPaymentsSpike(weeks([0, 0, 0, 7]))).toBeNull();
  });
});

describe('evaluateFunnelDrop', () => {
  it('does not fire with fewer than two points or nullish input', () => {
    expect(evaluateFunnelDrop(rates([40]))).toBeNull();
    expect(evaluateFunnelDrop(undefined)).toBeNull();
  });

  it('does not fire at exactly a 15-point drop', () => {
    expect(evaluateFunnelDrop(rates([40, 40, 40, 25]))).toBeNull();
  });

  it('fires watch when the latest week drops more than 15 points', () => {
    const signal = evaluateFunnelDrop(rates([40, 40, 40, 24]));
    expect(signal).toMatchObject({
      id: 'funnel-drop',
      severity: 'watch',
      value: '24.0%',
    });
  });
});

describe('evaluateConversionSuccess', () => {
  it('does not fire at or above the 90% floor', () => {
    expect(evaluateConversionSuccess(90)).toBeNull();
    expect(evaluateConversionSuccess(96.2)).toBeNull();
    expect(evaluateConversionSuccess(null)).toBeNull();
  });

  it('fires watch below the floor', () => {
    const signal = evaluateConversionSuccess(88.4);
    expect(signal).toMatchObject({
      id: 'conversion-success',
      severity: 'watch',
      value: '88.4%',
    });
  });
});

describe('computeTodaySignals', () => {
  it('returns an empty array when no rule fires', () => {
    expect(
      computeTodaySignals({
        unresolvedErrorGroups: [],
        failedPaymentsWeekly: weeks([1, 1, 1, 1]),
        uploadDownloadWeekly: rates([40, 40, 40, 41]),
        conversionSuccessRatePct: 97,
      })
    ).toEqual([]);
  });

  it('orders urgent signals ahead of watch signals', () => {
    const signals = computeTodaySignals({
      unresolvedErrorGroups: [buildErrorGroup()],
      failedPaymentsWeekly: weeks([1, 1, 1, 1]),
      uploadDownloadWeekly: rates([40, 40, 40, 20]),
      conversionSuccessRatePct: 80,
    });
    expect(signals.map((s) => s.id)).toEqual([
      'unresolved-errors',
      'funnel-drop',
      'conversion-success',
    ]);
    expect(signals.every((s) => s.copyText.includes('2anki/server'))).toBe(
      true
    );
  });
});
