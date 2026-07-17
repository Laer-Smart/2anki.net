export type WorkMixBucket =
  | 'acquisition'
  | 'monetization'
  | 'core-quality'
  | 'new-surface'
  | 'process';

export interface MergedPr {
  title: string;
  labels?: string[];
}

export interface WorkMixSummary {
  total: number;
  counts: Record<WorkMixBucket, number>;
  shares: Record<WorkMixBucket, number>;
  acquisitionShare: number;
  acquisitionCount: number;
  belowAllocationFloor: boolean;
}

export const ACQUISITION_FLOOR = 0.25;

const ACQUISITION_KEYWORDS = [
  'landing',
  'seo',
  'sitemap',
  'onboard',
  'signup',
  'sign up',
  'sign-up',
  'sign in',
  'first-conversion',
  'funnel',
  'referral',
  'meta description',
  'meta tag',
  'og image',
  'open graph',
  'structured data',
  'blog',
  'topical',
  'pain-wedge',
  'hero',
  'acquisition',
];

const MONETIZATION_KEYWORDS = [
  'pricing',
  'paywall',
  'checkout',
  'subscription',
  'billing',
  'upsell',
  'upgrade',
  'retention',
  'churn',
  'cancel',
  'dunning',
  'win-back',
  'winback',
  'stripe',
  'price',
  'pass ',
  'invoice',
  'refund',
];

function prefixOf(title: string): string {
  const match = /^([a-z]+)(\([^)]*\))?!?:/i.exec(title.trim());
  return match ? match[1].toLowerCase() : '';
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function classifyPr(pr: MergedPr): WorkMixBucket {
  const haystack = `${pr.title} ${(pr.labels ?? []).join(' ')}`.toLowerCase();

  if (containsAny(haystack, ACQUISITION_KEYWORDS)) {
    return 'acquisition';
  }
  if (containsAny(haystack, MONETIZATION_KEYWORDS)) {
    return 'monetization';
  }

  const prefix = prefixOf(pr.title);
  if (
    ['chore', 'ci', 'build', 'test', 'docs', 'style', 'refactor'].includes(
      prefix
    )
  ) {
    return 'process';
  }
  if (prefix === 'fix' || prefix === 'perf') {
    return 'core-quality';
  }
  if (prefix === 'feat') {
    return 'new-surface';
  }
  return 'core-quality';
}

export function summarizeWorkMix(prs: MergedPr[]): WorkMixSummary {
  const counts: Record<WorkMixBucket, number> = {
    acquisition: 0,
    monetization: 0,
    'core-quality': 0,
    'new-surface': 0,
    process: 0,
  };

  for (const pr of prs) {
    counts[classifyPr(pr)] += 1;
  }

  const total = prs.length;
  const shareOf = (n: number) => (total === 0 ? 0 : n / total);
  const shares: Record<WorkMixBucket, number> = {
    acquisition: shareOf(counts.acquisition),
    monetization: shareOf(counts.monetization),
    'core-quality': shareOf(counts['core-quality']),
    'new-surface': shareOf(counts['new-surface']),
    process: shareOf(counts.process),
  };

  return {
    total,
    counts,
    shares,
    acquisitionShare: shares.acquisition,
    acquisitionCount: counts.acquisition,
    belowAllocationFloor: total > 0 && shares.acquisition < ACQUISITION_FLOOR,
  };
}
