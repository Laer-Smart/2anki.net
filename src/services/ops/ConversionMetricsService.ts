import type { IJobsMetricsRepository } from '../../data_layer/JobsMetricsRepository';

export type ConversionMetricKey =
  | 'free_conversions_7d'
  | 'paid_conversions_7d'
  | 'free_conversion_success_rate_7d'
  | 'paid_conversion_success_rate_7d'
  | 'conversion_errors_7d_top_reasons'
  | 'failed_conversions_weekly';

export interface ConversionErrorCount {
  reason: string;
  count: number;
}

export interface FailedConversionsWeekPoint {
  week: string;
  count: number;
}

export interface ConversionMetricsResponse {
  free_conversions_7d: number | null;
  paid_conversions_7d: number | null;
  free_conversion_success_rate_7d: number | null;
  paid_conversion_success_rate_7d: number | null;
  conversion_errors_7d_top_reasons: ConversionErrorCount[] | null;
  failed_conversions_weekly: FailedConversionsWeekPoint[] | null;
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const WEEKLY_HISTORY_WEEKS = 12;

export class ConversionMetricsService {
  constructor(private readonly repository: IJobsMetricsRepository) {}

  async getMetrics(): Promise<ConversionMetricsResponse> {
    const now = new Date();
    const sevenDaysAgoMs = now.getTime() - 7 * SECONDS_PER_DAY * 1000;
    const sevenDaysAgo = new Date(sevenDaysAgoMs);

    const weekStarts = this.lastNIsoWeekStartsUtc(now, WEEKLY_HISTORY_WEEKS);
    const earliestStart = new Date(weekStarts[0]);
    const lastStart = weekStarts[weekStarts.length - 1];
    const weekEnd = new Date(lastStart + 7 * SECONDS_PER_DAY * 1000);

    const [
      freeConversions7d,
      paidConversions7d,
      freeSuccessRate7d,
      paidSuccessRate7d,
      topErrors7d,
      failedConversionsWeeklyRows,
    ] = await Promise.allSettled([
      this.repository.countFreeConversions7d(sevenDaysAgo),
      this.repository.countPaidConversions7d(sevenDaysAgo),
      this.repository.computeFreeSuccessRate7d(sevenDaysAgo),
      this.repository.computePaidSuccessRate7d(sevenDaysAgo),
      this.repository.topFailureReasons7d(sevenDaysAgo),
      this.repository.failedConversionsWeekly(earliestStart, weekEnd),
    ]);

    const failedConversionsWeekly =
      failedConversionsWeeklyRows.status === 'fulfilled'
        ? this.buildWeeklyTimeSeries(weekStarts, failedConversionsWeeklyRows.value)
        : null;

    return {
      free_conversions_7d:
        freeConversions7d.status === 'fulfilled' ? freeConversions7d.value : null,
      paid_conversions_7d:
        paidConversions7d.status === 'fulfilled' ? paidConversions7d.value : null,
      free_conversion_success_rate_7d:
        freeSuccessRate7d.status === 'fulfilled' ? freeSuccessRate7d.value : null,
      paid_conversion_success_rate_7d:
        paidSuccessRate7d.status === 'fulfilled' ? paidSuccessRate7d.value : null,
      conversion_errors_7d_top_reasons:
        topErrors7d.status === 'fulfilled' ? topErrors7d.value : null,
      failed_conversions_weekly: failedConversionsWeekly,
    };
  }

  private buildWeeklyTimeSeries(
    weekStarts: number[],
    rows: Array<{ weekStart: Date; count: number }>
  ): FailedConversionsWeekPoint[] {
    const weekIndex = new Map<number, FailedConversionsWeekPoint>();

    for (const startMs of weekStarts) {
      weekIndex.set(startMs, {
        week: this.isoDate(startMs),
        count: 0,
      });
    }

    for (const row of rows) {
      const bucket = this.isoWeekStartUtcMs(row.weekStart.getTime());
      const existing = weekIndex.get(bucket);
      if (existing) {
        existing.count = row.count;
      }
    }

    return weekStarts.map(
      (startMs) => weekIndex.get(startMs) as FailedConversionsWeekPoint
    );
  }

  private isoDate(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
  }

  private isoWeekStartUtcMs(atMs: number): number {
    const dayStart = this.startOfDayUtcMs(atMs);
    const dow = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (dow + 6) % 7;
    return dayStart - daysSinceMonday * SECONDS_PER_DAY * 1000;
  }

  private startOfDayUtcMs(atMs: number): number {
    const d = new Date(atMs);
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      0,
      0,
      0,
      0
    );
  }

  private lastNIsoWeekStartsUtc(now: Date, n: number): number[] {
    const currentWeekStart = this.isoWeekStartUtcMs(now.getTime());
    const result: number[] = [];
    for (let offset = n - 1; offset >= 0; offset -= 1) {
      result.push(currentWeekStart - offset * 7 * SECONDS_PER_DAY * 1000);
    }
    return result;
  }
}
