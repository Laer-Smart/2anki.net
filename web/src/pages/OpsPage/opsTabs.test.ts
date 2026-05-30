import { describe, expect, it } from 'vitest';
import { OPS_TABS } from './opsTabs';

describe('OPS_TABS', () => {
  it('lists all 12 ops tabs with the Engineering index first', () => {
    expect(OPS_TABS).toHaveLength(12);
    expect(OPS_TABS[0]).toMatchObject({ to: '/ops', label: 'Engineering' });
  });

  it('has a unique route for every tab', () => {
    const paths = OPS_TABS.map((tab) => tab.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('matches the index only on /ops, not on child routes', () => {
    const index = OPS_TABS[0];
    expect(index.match('/ops')).toBe(true);
    expect(index.match('/ops?window=24h')).toBe(true);
    expect(index.match('/ops/errors')).toBe(false);
  });

  it('matches a child tab on its own route', () => {
    const errors = OPS_TABS.find((tab) => tab.to === '/ops/errors');
    expect(errors?.match('/ops/errors')).toBe(true);
    expect(errors?.match('/ops')).toBe(false);
  });
});
