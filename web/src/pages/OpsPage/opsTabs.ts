export interface OpsTab {
  to: string;
  label: string;
  match: (path: string) => boolean;
}

export const OPS_TABS: OpsTab[] = [
  {
    to: '/ops',
    label: 'Engineering',
    match: (path) => path === '/ops' || path.startsWith('/ops?'),
  },
  {
    to: '/ops/errors',
    label: 'Errors',
    match: (path) => path.startsWith('/ops/errors'),
  },
  {
    to: '/ops/performance',
    label: 'Performance',
    match: (path) => path.startsWith('/ops/performance'),
  },
  {
    to: '/ops/conversions',
    label: 'Conversions',
    match: (path) => path.startsWith('/ops/conversions'),
  },
  {
    to: '/ops/return-rate',
    label: 'Return rate',
    match: (path) => path.startsWith('/ops/return-rate'),
  },
  {
    to: '/ops/mindmaps',
    label: 'Mindmaps',
    match: (path) => path.startsWith('/ops/mindmaps'),
  },
  {
    to: '/ops/upload-funnel',
    label: 'Upload funnel',
    match: (path) => path.startsWith('/ops/upload-funnel'),
  },
  {
    to: '/ops/business',
    label: 'Business',
    match: (path) => path.startsWith('/ops/business'),
  },
  {
    to: '/ops/showcase',
    label: 'Showcase',
    match: (path) => path.startsWith('/ops/showcase'),
  },
  {
    to: '/ops/interviews',
    label: 'Interviews',
    match: (path) => path.startsWith('/ops/interviews'),
  },
  {
    to: '/ops/messages',
    label: 'Messages',
    match: (path) => path.startsWith('/ops/messages'),
  },
  {
    to: '/ops/commands',
    label: 'Commands',
    match: (path) => path.startsWith('/ops/commands'),
  },
  {
    to: '/ops/flags',
    label: 'Flags',
    match: (path) => path.startsWith('/ops/flags'),
  },
  {
    to: '/ops/pricing-ab',
    label: 'Pricing A/B',
    match: (path) => path.startsWith('/ops/pricing-ab'),
  },
];
