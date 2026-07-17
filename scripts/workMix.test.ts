import { ACQUISITION_FLOOR, classifyPr, summarizeWorkMix } from './workMix';

describe('classifyPr', () => {
  it('routes landing/SEO/onboarding/signup work to acquisition regardless of prefix', () => {
    expect(
      classifyPr({ title: 'feat: add NCLEX pain-wedge landing pages' })
    ).toBe('acquisition');
    expect(classifyPr({ title: 'fix: sitemap drops localized routes' })).toBe(
      'acquisition'
    );
    expect(classifyPr({ title: 'chore: tweak signup copy' })).toBe(
      'acquisition'
    );
  });

  it('routes pricing/paywall/billing/churn work to monetization', () => {
    expect(
      classifyPr({ title: 'feat: win-back email for lapsed buyers' })
    ).toBe('monetization');
    expect(
      classifyPr({ title: 'fix: enable invoice_creation on Checkout' })
    ).toBe('monetization');
  });

  it('classifies by conventional-commit prefix when no keyword matches', () => {
    expect(classifyPr({ title: 'feat: image occlusion editor' })).toBe(
      'new-surface'
    );
    expect(classifyPr({ title: 'fix: guard undefined card answer' })).toBe(
      'core-quality'
    );
    expect(classifyPr({ title: 'perf: bound conversion worker memory' })).toBe(
      'core-quality'
    );
    expect(classifyPr({ title: 'chore(deps): bump production group' })).toBe(
      'process'
    );
    expect(classifyPr({ title: 'refactor: back block types with a Map' })).toBe(
      'process'
    );
  });

  it('reads labels as well as the title', () => {
    expect(
      classifyPr({ title: 'feat: new hero section', labels: ['acquisition'] })
    ).toBe('acquisition');
  });

  it('falls back to core-quality for an unrecognized prefix', () => {
    expect(classifyPr({ title: 'wip messing around' })).toBe('core-quality');
  });
});

describe('summarizeWorkMix', () => {
  it('counts buckets and computes shares', () => {
    const summary = summarizeWorkMix([
      { title: 'feat: NCLEX landing page' },
      { title: 'feat: MCAT landing page' },
      { title: 'fix: paywall price display' },
      { title: 'chore(deps): bump group' },
    ]);

    expect(summary.total).toBe(4);
    expect(summary.counts.acquisition).toBe(2);
    expect(summary.counts.monetization).toBe(1);
    expect(summary.counts.process).toBe(1);
    expect(summary.acquisitionShare).toBe(0.5);
    expect(summary.belowAllocationFloor).toBe(false);
  });

  it('flags a week below the 25% acquisition floor', () => {
    const summary = summarizeWorkMix([
      { title: 'fix: parser crash' },
      { title: 'chore: ci tweak' },
      { title: 'test: add coverage' },
      { title: 'refactor: extract helper' },
    ]);

    expect(summary.acquisitionShare).toBeLessThan(ACQUISITION_FLOOR);
    expect(summary.belowAllocationFloor).toBe(true);
  });

  it('does not flag an empty week (nothing shipped, nothing to allocate)', () => {
    const summary = summarizeWorkMix([]);
    expect(summary.total).toBe(0);
    expect(summary.belowAllocationFloor).toBe(false);
  });
});
