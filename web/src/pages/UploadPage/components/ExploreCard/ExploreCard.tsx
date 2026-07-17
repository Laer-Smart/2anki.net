import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { track } from '../../../../lib/analytics/track';
import { isPayingUser } from '../../../../components/NavigationBar/helpers/getPlanLabel';
import { useUserLocals } from '../../../../lib/hooks/useUserLocals';
import styles from './ExploreCard.module.css';

function MultipleChoiceIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="6" cy="18" r="2" />
      <line x1="11" y1="6" x2="20" y2="6" />
      <line x1="11" y1="12" x2="20" y2="12" />
      <line x1="11" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7h3l2-3h8l2 3h3v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export function ExploreCard() {
  const { t } = useTranslation();
  const { data } = useUserLocals();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('photo_entry_point_viewed', { surface: 'upload_page' });
  }, []);

  const isPaying = isPayingUser(data?.locals);
  const showFreePlanHint = data != null && !isPaying;

  return (
    <section className={styles.wrapper} aria-labelledby="explore-card-heading">
      <header className={styles.header}>
        <h2 id="explore-card-heading" className={styles.heading}>
          {t('upload.explore.heading')}
        </h2>
        <p className={styles.sub}>{t('upload.explore.sub')}</p>
      </header>
      <ul className={styles.card}>
        <li className={styles.row}>
          <div className={styles.rowIcon}>
            <MultipleChoiceIcon />
          </div>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{t('cardOptions.mcq.heading')}</p>
            <p className={styles.rowDescription}>
              {t('upload.explore.mcqBody')}
            </p>
          </div>
          <div className={styles.rowAffordance}>
            <Link
              to="/card-options?returnTo=/upload#mcq"
              className={styles.linkCta}
            >
              {t('upload.explore.mcqCta')}
            </Link>
          </div>
        </li>
        <li className={styles.row}>
          <div className={styles.rowIcon}>
            <CameraIcon />
          </div>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{t('nav.photoToDeck')}</p>
            <p className={styles.rowDescription}>
              {t('upload.explore.photoBody')}
            </p>
            {showFreePlanHint && (
              <p className={styles.rowHint}>
                {t('upload.explore.freePhotoHint')}
              </p>
            )}
          </div>
          <div className={styles.rowAffordance}>
            <Link
              to="/photo-to-deck"
              className={styles.linkCta}
              onClick={() =>
                track('photo_entry_point_clicked', { surface: 'upload_page' })
              }
            >
              {t('nav.photoToDeck')}
            </Link>
          </div>
        </li>
        <li className={styles.row}>
          <div className={styles.rowIcon}>
            <GearIcon />
          </div>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>
              {t('upload.explore.deckDefaults')}
            </p>
            <p className={styles.rowDescription}>
              {t('upload.explore.deckDefaultsBody')}
            </p>
          </div>
          <div className={styles.rowAffordance}>
            <Link
              to="/card-options?returnTo=/upload"
              className={styles.linkCta}
            >
              {t('nav.settings')}
            </Link>
          </div>
        </li>
      </ul>
    </section>
  );
}
