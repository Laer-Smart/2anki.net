import { describe, expect, it } from 'vitest';
import {
  annualSavingsPercent,
  formatAnnual,
  formatAnnualPerMonth,
  formatMonthly,
} from './pricing.constants';

describe('pricing formatters', () => {
  it('formats whole-dollar monthly amounts without decimals', () => {
    expect(formatMonthly(600)).toBe('$6');
  });

  it('formats fractional monthly amounts with two decimals', () => {
    expect(formatMonthly(799)).toBe('$7.99');
  });

  it('formats annual amounts', () => {
    expect(formatAnnual(6400)).toBe('$64');
    expect(formatAnnual(6000)).toBe('$60');
  });

  it('formats the annual per-month figure', () => {
    expect(formatAnnualPerMonth(6400)).toBe('$5.33');
    expect(formatAnnualPerMonth(6000)).toBe('$5.00');
  });

  it('computes the savings percent of annual over monthly', () => {
    expect(annualSavingsPercent(799, 6400)).toBe(33);
    expect(annualSavingsPercent(600, 6000)).toBe(17);
  });
});
