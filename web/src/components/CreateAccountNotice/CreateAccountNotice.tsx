import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { track } from '../../lib/analytics/track';
import styles from '../PassLadderCard/PassLadderCard.module.css';

const SURFACE = 'upload_success_signup';

export function CreateAccountNotice() {
  const shownFiredRef = useRef(false);

  useEffect(() => {
    if (shownFiredRef.current) return;
    shownFiredRef.current = true;
    track('account_offer_shown', { surface: SURFACE });
  }, []);

  return (
    <section className={styles.card} aria-label="Save your next decks">
      <p className={styles.headline}>Keep your next decks</p>
      <p className={styles.body}>
        With a free account, every deck you convert is saved to your downloads
        history — re-download any of them later.
      </p>
      <Link
        className={styles.cta}
        to="/register?redirect=/upload"
        onClick={() => track('account_offer_clicked', { surface: SURFACE })}
      >
        Create a free account
      </Link>
    </section>
  );
}
