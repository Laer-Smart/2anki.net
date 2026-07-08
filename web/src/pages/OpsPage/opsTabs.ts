export interface OpsTab {
  to: string;
  label: string;
  match: (path: string) => boolean;
}

export interface OpsTabGroup {
  label: string;
  tabs: OpsTab[];
}

const childRoute =
  (prefix: string) =>
  (path: string): boolean =>
    path.startsWith(prefix);

const engineeringIndex: OpsTab = {
  to: '/ops',
  label: 'Engineering',
  match: (path) => path === '/ops' || path.startsWith('/ops?'),
};

export const OPS_TAB_GROUPS: OpsTabGroup[] = [
  {
    label: 'Today',
    tabs: [
      {
        to: '/ops/today',
        label: 'Today',
        match: childRoute('/ops/today'),
      },
    ],
  },
  {
    label: 'Growth',
    tabs: [
      {
        to: '/ops/conversions',
        label: 'Conversions',
        match: childRoute('/ops/conversions'),
      },
      {
        to: '/ops/upload-funnel',
        label: 'Upload funnel',
        match: childRoute('/ops/upload-funnel'),
      },
      {
        to: '/ops/return-rate',
        label: 'Return rate',
        match: childRoute('/ops/return-rate'),
      },
      {
        to: '/ops/business',
        label: 'Business',
        match: childRoute('/ops/business'),
      },
    ],
  },
  {
    label: 'System',
    tabs: [
      engineeringIndex,
      {
        to: '/ops/errors',
        label: 'Errors',
        match: childRoute('/ops/errors'),
      },
      {
        to: '/ops/performance',
        label: 'Performance',
        match: childRoute('/ops/performance'),
      },
    ],
  },
  {
    label: 'Voice',
    tabs: [
      {
        to: '/ops/messages',
        label: 'Messages',
        match: childRoute('/ops/messages'),
      },
      {
        to: '/ops/interviews',
        label: 'Interviews',
        match: childRoute('/ops/interviews'),
      },
      {
        to: '/ops/showcase',
        label: 'Showcase',
        match: childRoute('/ops/showcase'),
      },
    ],
  },
  {
    label: 'Controls',
    tabs: [
      {
        to: '/ops/commands',
        label: 'Commands',
        match: childRoute('/ops/commands'),
      },
      {
        to: '/ops/flags',
        label: 'Flags',
        match: childRoute('/ops/flags'),
      },
    ],
  },
];

export const OPS_TABS: OpsTab[] = OPS_TAB_GROUPS.flatMap((group) => group.tabs);
