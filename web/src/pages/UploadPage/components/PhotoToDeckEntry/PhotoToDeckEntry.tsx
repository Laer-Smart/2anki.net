import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { track } from '../../../../lib/analytics/track';
import { isPayingUser } from '../../../../components/NavigationBar/helpers/getPlanLabel';
import { useUserLocals } from '../../../../lib/hooks/useUserLocals';
import styles from './PhotoToDeckEntry.module.css';

export function PhotoToDeckEntry() {
  const { data } = useUserLocals();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('photo_entry_point_viewed', { surface: 'upload_page' });
  }, []);

  const isPaying = isPayingUser(data?.locals);
  const isLoading = data == null;

  return (
    <section className={styles.strip} aria-label="Photo to deck">
      <p className={styles.heading}>Try photo to deck</p>
      <p className={styles.body}>
        Snap a textbook page, lecture slide, or handwritten notes — we&apos;ll make the cards.
      </p>
      <Link
        to="/photo-to-deck"
        className={styles.cta}
        onClick={() => track('photo_entry_point_clicked', { surface: 'upload_page' })}
      >
        Open photo to deck
      </Link>
      {!isLoading && !isPaying && (
        <p className={styles.freePlanHint}>Free plan: 5 photos per month</p>
      )}
    </section>
  );
}
