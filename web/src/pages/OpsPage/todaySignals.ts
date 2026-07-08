import { FailedPaymentsWeekPoint } from './businessTypes';
import { ErrorGroup } from './errorsTypes';

export type SignalSeverity = 'urgent' | 'watch';

export interface TodaySignal {
  id: string;
  severity: SignalSeverity;
  label: string;
  value: string;
  delta: string;
  copyText: string;
}

export interface WeeklyRatePoint {
  week: string;
  rate: number;
}

export const FAILED_PAYMENTS_SPIKE_MULTIPLIER = 2;
export const FUNNEL_DROP_POINTS = 15;
export const CONVERSION_SUCCESS_FLOOR_PCT = 90;

const mean = (values: number[]): number =>
  values.reduce((sum, n) => sum + n, 0) / values.length;

const buildCopyText = (heading: string, facts: string[]): string =>
  [
    `## ${heading} — triage request`,
    '',
    ...facts.map((fact) => `- ${fact}`),
    '',
    'Repo: 2anki/server. Investigate the likely cause and propose the smallest fix.',
  ].join('\n');

export function evaluateUnresolvedErrors(
  groups: ErrorGroup[] | null | undefined
): TodaySignal | null {
  if (groups == null || groups.length === 0) {
    return null;
  }
  const occurrences = groups.reduce((sum, g) => sum + g.occurrences, 0);
  const top = [...groups].sort((a, b) => b.occurrences - a.occurrences)[0];
  return {
    id: 'unresolved-errors',
    severity: 'urgent',
    label: 'Unresolved error groups',
    value: String(groups.length),
    delta: `${occurrences} occurrences`,
    copyText: buildCopyText('Unresolved errors', [
      `${groups.length} unresolved error group(s), ${occurrences} occurrences total.`,
      `Most frequent: ${top.message} (${top.occurrences}x, source ${top.source}).`,
      'See /ops/errors for the full list and stacks.',
    ]),
  };
}

export function evaluateFailedPaymentsSpike(
  weekly: FailedPaymentsWeekPoint[] | null | undefined,
  multiplier: number = FAILED_PAYMENTS_SPIKE_MULTIPLIER
): TodaySignal | null {
  if (weekly == null || weekly.length < 2) {
    return null;
  }
  const latest = weekly[weekly.length - 1].count;
  const priorAvg = mean(weekly.slice(0, -1).map((w) => w.count));
  if (priorAvg <= 0 || latest <= multiplier * priorAvg) {
    return null;
  }
  return {
    id: 'failed-payments-spike',
    severity: 'urgent',
    label: 'Failed payments this week',
    value: String(latest),
    delta: `avg ${priorAvg.toFixed(1)} → ${latest}`,
    copyText: buildCopyText('Failed payments spike', [
      `Latest week: ${latest} failed payments.`,
      `Prior-weeks average: ${priorAvg.toFixed(1)} (threshold: ${multiplier}x).`,
      'Check Stripe dashboard and /ops/business for the affected subscriptions.',
    ]),
  };
}

export function evaluateFunnelDrop(
  points: WeeklyRatePoint[] | null | undefined,
  dropPoints: number = FUNNEL_DROP_POINTS
): TodaySignal | null {
  if (points == null || points.length < 2) {
    return null;
  }
  const latest = points[points.length - 1].rate;
  const earlierAvg = mean(points.slice(0, -1).map((p) => p.rate));
  const drop = earlierAvg - latest;
  if (drop <= dropPoints) {
    return null;
  }
  return {
    id: 'funnel-drop',
    severity: 'watch',
    label: 'Upload → download rate',
    value: `${latest.toFixed(1)}%`,
    delta: `-${drop.toFixed(1)} pts`,
    copyText: buildCopyText('Upload to download funnel drop', [
      `Latest week: ${latest.toFixed(1)}% upload-to-download.`,
      `Earlier-weeks average: ${earlierAvg.toFixed(1)}% (drop threshold: ${dropPoints} pts).`,
      'Check /ops/upload-funnel and /ops/conversions for a regression.',
    ]),
  };
}

export function evaluateConversionSuccess(
  successRatePct: number | null | undefined,
  floor: number = CONVERSION_SUCCESS_FLOOR_PCT
): TodaySignal | null {
  if (successRatePct == null || successRatePct >= floor) {
    return null;
  }
  return {
    id: 'conversion-success',
    severity: 'watch',
    label: 'Conversion success rate',
    value: `${successRatePct.toFixed(1)}%`,
    delta: `below ${floor}%`,
    copyText: buildCopyText('Conversion success rate below floor', [
      `Current success rate: ${successRatePct.toFixed(1)}% (floor: ${floor}%).`,
      'Check /ops/conversions for the top failure reasons.',
    ]),
  };
}

export interface TodaySignalsInput {
  unresolvedErrorGroups: ErrorGroup[] | null | undefined;
  failedPaymentsWeekly: FailedPaymentsWeekPoint[] | null | undefined;
  uploadDownloadWeekly: WeeklyRatePoint[] | null | undefined;
  conversionSuccessRatePct: number | null | undefined;
}

const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  urgent: 0,
  watch: 1,
};

export function computeTodaySignals(input: TodaySignalsInput): TodaySignal[] {
  const signals = [
    evaluateUnresolvedErrors(input.unresolvedErrorGroups),
    evaluateFailedPaymentsSpike(input.failedPaymentsWeekly),
    evaluateFunnelDrop(input.uploadDownloadWeekly),
    evaluateConversionSuccess(input.conversionSuccessRatePct),
  ].filter((signal): signal is TodaySignal => signal != null);

  return signals.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}
