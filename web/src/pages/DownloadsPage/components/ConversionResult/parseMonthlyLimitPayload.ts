export interface MonthlyLimitPayload {
  code: 'monthly_limit';
  cards_used: number;
  limit: number;
  reset_on?: string;
}

export function parseMonthlyLimitPayload(
  jobReasonFailure: string | null
): MonthlyLimitPayload | null {
  if (jobReasonFailure == null) return null;
  try {
    const parsed = JSON.parse(jobReasonFailure) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      (parsed as Record<string, unknown>).code !== 'monthly_limit'
    ) {
      return null;
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.cards_used !== 'number' || typeof p.limit !== 'number') {
      return null;
    }
    return {
      code: 'monthly_limit',
      cards_used: p.cards_used,
      limit: p.limit,
      reset_on: typeof p.reset_on === 'string' ? p.reset_on : undefined,
    };
  } catch {
    return null;
  }
}
