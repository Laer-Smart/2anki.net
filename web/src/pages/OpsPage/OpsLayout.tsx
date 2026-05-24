import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';

const PAGE_TITLE = 'Ops · 2anki';

const TABS = [
  { to: '/ops', label: 'Engineering', match: (path: string) => path === '/ops' || path.startsWith('/ops?') },
  { to: '/ops/errors', label: 'Errors', match: (path: string) => path.startsWith('/ops/errors') },
  { to: '/ops/performance', label: 'Performance', match: (path: string) => path.startsWith('/ops/performance') },
  { to: '/ops/conversions', label: 'Conversions', match: (path: string) => path.startsWith('/ops/conversions') },
  { to: '/ops/business', label: 'Business', match: (path: string) => path.startsWith('/ops/business') },
  { to: '/ops/showcase', label: 'Showcase', match: (path: string) => path.startsWith('/ops/showcase') },
  { to: '/ops/interviews', label: 'Interviews', match: (path: string) => path.startsWith('/ops/interviews') },
  { to: '/ops/messages', label: 'Messages', match: (path: string) => path.startsWith('/ops/messages') },
  { to: '/ops/commands', label: 'Commands', match: (path: string) => path.startsWith('/ops/commands') },
];

export default function OpsLayout() {
  const location = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  const fullPath = `${location.pathname}${location.search}`;

  return (
    <main className={sharedStyles.pageWide} data-hj-suppress>
      <h1 className={sharedStyles.title}>Ops</h1>
      <nav aria-label="Ops sections" className={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = tab.match(fullPath);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={
                isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
              }
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </main>
  );
}
