import {
  LEGACY_LOCK_IN_WINDOW_END,
  PRICING_AMOUNTS,
  PricingCohort,
  resolveCohort,
} from './pricingV2';

export interface PricingForUserResult {
  cohort: PricingCohort;
  monthlyCents: number;
  annualCents: number;
  lockInDeadline: string | null;
}

export function resolvePricingForUser(input: {
  flagOn: boolean;
  createdAt: Date | null | undefined;
  now: Date;
}): PricingForUserResult {
  const cohort = resolveCohort(input);
  const amounts = cohort === 'legacy' ? PRICING_AMOUNTS.legacy : PRICING_AMOUNTS.v2;
  const showsLockIn =
    input.flagOn &&
    cohort === 'legacy' &&
    input.now.getTime() < LEGACY_LOCK_IN_WINDOW_END.getTime();
  return {
    cohort,
    monthlyCents: amounts.monthly,
    annualCents: amounts.annual,
    lockInDeadline: showsLockIn ? LEGACY_LOCK_IN_WINDOW_END.toISOString() : null,
  };
}
