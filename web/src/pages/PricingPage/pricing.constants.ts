export interface UnlimitedPricing {
  monthlyCents: number;
  annualCents: number;
  legacy: boolean;
  lockInDeadline: string | null;
}

export const LEGACY_UNLIMITED_PRICING: UnlimitedPricing = {
  monthlyCents: 799,
  annualCents: 6400,
  legacy: false,
  lockInDeadline: null,
};

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function formatMonthly(cents: number): string {
  return formatDollars(cents);
}

export function formatAnnual(cents: number): string {
  return formatDollars(cents);
}

export function formatAnnualPerMonth(annualCents: number): string {
  const perMonth = annualCents / 12 / 100;
  return `$${perMonth.toFixed(2)}`;
}

export function annualSavingsPercent(
  monthlyCents: number,
  annualCents: number
): number {
  if (monthlyCents <= 0) return 0;
  const fullYear = monthlyCents * 12;
  return Math.round(((fullYear - annualCents) / fullYear) * 100);
}
