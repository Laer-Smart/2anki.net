export const PRICING_V2_FLAG = 'pricing_v2';

export const LEGACY_LOCK_IN_CUTOVER = new Date('2026-06-15T07:00:00Z');

export const LEGACY_LOCK_IN_WINDOW_END = new Date('2026-06-21T21:59:00Z');

export const V2_MONTHLY_LOOKUP_KEY = 'v2_monthly';
export const V2_ANNUAL_LOOKUP_KEY = 'v2_annual';

export const PRICING_AMOUNTS = {
  legacy: {
    monthly: 600,
    annual: 6000,
  },
  v2: {
    monthly: 799,
    annual: 6400,
  },
} as const;

export interface CohortInput {
  createdAt: Date | null | undefined;
  now: Date;
}

export function qualifiesForLegacyWindow(input: CohortInput): boolean {
  const { createdAt, now } = input;
  if (createdAt == null) return false;
  const createdBeforeCutover =
    createdAt.getTime() < LEGACY_LOCK_IN_CUTOVER.getTime();
  const withinWindow = now.getTime() < LEGACY_LOCK_IN_WINDOW_END.getTime();
  return createdBeforeCutover && withinWindow;
}

export type PricingCohort = 'legacy' | 'v2';

export function resolveCohort(input: {
  flagOn: boolean;
  createdAt: Date | null | undefined;
  now: Date;
}): PricingCohort {
  if (!input.flagOn) return 'legacy';
  return qualifiesForLegacyWindow(input) ? 'legacy' : 'v2';
}
