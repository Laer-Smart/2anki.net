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
  free_blocked_by_plan_7d: number | null;
  paid_blocked_by_plan_7d: number | null;
  conversion_errors_7d_top_reasons: ConversionErrorCount[] | null;
  failed_conversions_weekly: FailedConversionsWeekPoint[] | null;
  time_to_first_deck_median_minutes_30d: number | null;
  upload_to_download_rate_7d: number | null;
}
