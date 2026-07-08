export interface OpsTab {
  to: string;
  label: string;
  match: (path: string) => boolean;
}

const childRoute =
  (prefix: string) =>
  (path: string): boolean =>
    path.startsWith(prefix);

const systemTab: OpsTab = {
  to: '/ops/system',
  label: 'System',
  match: (path) =>
    path === '/ops' ||
    path.startsWith('/ops?') ||
    path.startsWith('/ops/system'),
};

export const OPS_TABS: OpsTab[] = [
  {
    to: '/ops/today',
    label: 'Today',
    match: childRoute('/ops/today'),
  },
  {
    to: '/ops/growth',
    label: 'Growth',
    match: childRoute('/ops/growth'),
  },
  {
    to: '/ops/business',
    label: 'Business',
    match: childRoute('/ops/business'),
  },
  systemTab,
  {
    to: '/ops/errors',
    label: 'Errors',
    match: childRoute('/ops/errors'),
  },
  {
    to: '/ops/messages',
    label: 'Messages',
    match: childRoute('/ops/messages'),
  },
  {
    to: '/ops/commands',
    label: 'Commands',
    match: childRoute('/ops/commands'),
  },
];
