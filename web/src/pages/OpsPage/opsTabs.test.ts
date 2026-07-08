import { describe, expect, it } from 'vitest';
import { OPS_TABS, OPS_TAB_GROUPS } from './opsTabs';

describe('OPS_TAB_GROUPS', () => {
  it('groups the tabs into Today, Growth, System, Voice, and Controls', () => {
    expect(OPS_TAB_GROUPS.map((group) => group.label)).toEqual([
      'Today',
      'Growth',
      'System',
      'Voice',
      'Controls',
    ]);
  });

  it('places Engineering first in the System group', () => {
    const system = OPS_TAB_GROUPS.find((group) => group.label === 'System');
    expect(system?.tabs[0]).toMatchObject({ to: '/ops', label: 'Engineering' });
  });
});

describe('OPS_TABS', () => {
  it('flattens every group into 13 tabs', () => {
    expect(OPS_TABS).toHaveLength(13);
  });

  it('no longer lists the retired Mindmaps and Pricing A/B tabs', () => {
    const paths = OPS_TABS.map((tab) => tab.to);
    expect(paths).not.toContain('/ops/mindmaps');
    expect(paths).not.toContain('/ops/pricing-ab');
  });

  it('has a unique route for every tab', () => {
    const paths = OPS_TABS.map((tab) => tab.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('matches the Engineering index only on /ops, not on child routes', () => {
    const index = OPS_TABS.find((tab) => tab.to === '/ops');
    expect(index?.match('/ops')).toBe(true);
    expect(index?.match('/ops?window=24h')).toBe(true);
    expect(index?.match('/ops/errors')).toBe(false);
  });

  it('matches a child tab on its own route', () => {
    const errors = OPS_TABS.find((tab) => tab.to === '/ops/errors');
    expect(errors?.match('/ops/errors')).toBe(true);
    expect(errors?.match('/ops')).toBe(false);
  });

  it('puts the Today home in the first group', () => {
    expect(OPS_TAB_GROUPS[0].label).toBe('Today');
    expect(OPS_TAB_GROUPS[0].tabs[0]).toMatchObject({
      to: '/ops/today',
      label: 'Today',
    });
    const index = OPS_TABS.find((tab) => tab.to === '/ops');
    expect(index?.match('/ops/today')).toBe(false);
  });
});
