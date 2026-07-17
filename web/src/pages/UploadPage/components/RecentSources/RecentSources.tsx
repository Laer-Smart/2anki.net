import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { getDistance } from '../../../../lib/getDistance';
import { track } from '../../../../lib/analytics/track';
import { getRecentSources, RecentSource } from './getRecentSources';
import styles from './RecentSources.module.css';

function RecentSourceRow({ source }: Readonly<{ source: RecentSource }>) {
  const { t } = useTranslation();
  return (
    <li className={styles.row}>
      <div className={styles.meta}>
        <span data-hj-suppress className={styles.title} title={source.title}>
          {source.title}
        </span>
        <span className={styles.timeAgo}>{getDistance(source.updatedAt)}</span>
      </div>
      <Link
        to={source.convertUrl}
        className={styles.action}
        onClick={() =>
          track('recent_page_reconvert_clicked', { type: source.type })
        }
      >
        {t('upload.recent.convertAgain')}
      </Link>
    </li>
  );
}

export function RecentSources() {
  const { t } = useTranslation();
  const { data: sources } = useQuery({
    queryKey: ['recentSources'],
    queryFn: getRecentSources,
  });

  if (sources == null || sources.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-label={t('upload.recent.title')}
      translate="no"
    >
      <h2 className={styles.heading}>{t('upload.recent.title')}</h2>
      <ul className={styles.list}>
        {sources.map((source) => (
          <RecentSourceRow
            key={`${source.type}-${source.id}`}
            source={source}
          />
        ))}
      </ul>
    </section>
  );
}

export default RecentSources;
