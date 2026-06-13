import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend } from '../../../lib/backend/Backend';
import { track } from '../../../lib/analytics/track';

interface Props {
  readonly backend?: Backend;
}

export default function FullStatsPanel({ backend }: Props) {
  const api = backend ?? get2ankiApi();
  const [open, setOpen] = useState(false);

  const stats = useQuery({
    queryKey: ['ankify-collection-stats-html'],
    queryFn: () => api.getAnkifyCollectionStatsHtml(),
    enabled: open,
  });

  const onToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = event.currentTarget.open;
    setOpen(isOpen);
    if (isOpen) {
      track('ankify_view_full_stats');
    }
  };

  const html = stats.data?.html ?? null;
  const truncated = stats.data?.truncated === true;

  return (
    <details className={styles.fullStats} onToggle={onToggle}>
      <summary className={styles.fullStatsSummary}>Full stats</summary>
      <div className={styles.fullStatsBody}>
        {stats.isLoading && (
          <p className={styles.emptyLine}>Reading your Anki stats</p>
        )}
        {!stats.isLoading && html == null && (
          <p className={styles.emptyLine}>
            Stats load once Anki is running. Open Anki, then try again.
          </p>
        )}
        {html != null && (
          <>
            {truncated && (
              <p className={styles.fullStatsTruncated}>
                Showing the first part of your stats — open Anki for the full
                report.
              </p>
            )}
            <iframe
              title="Anki collection stats"
              sandbox=""
              srcDoc={html}
              className={styles.fullStatsFrame}
            />
          </>
        )}
      </div>
    </details>
  );
}
