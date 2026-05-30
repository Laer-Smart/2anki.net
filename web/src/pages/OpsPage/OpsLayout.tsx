import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { OPS_TABS } from './opsTabs';

const PAGE_TITLE = 'Ops · 2anki';

export default function OpsLayout() {
  const location = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  const fullPath = `${location.pathname}${location.search}`;
  const activeTab = OPS_TABS.find((tab) => tab.match(fullPath));

  return (
    <main className={sharedStyles.pageWide} data-hj-suppress>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <h1 className={sharedStyles.title}>Ops</h1>
        {activeTab && (
          <span className={styles.breadcrumbSection} aria-current="page">
            {activeTab.label}
          </span>
        )}
      </nav>
      <Outlet />
    </main>
  );
}
