import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { track } from '../../../../lib/analytics/track';
import { isPayingUser } from '../../../../components/NavigationBar/helpers/getPlanLabel';
import { useUserLocals } from '../../../../lib/hooks/useUserLocals';
import CardStylePicker, {
  CARD_STYLE_KEY,
  DEFAULT_CARD_STYLE,
} from '../UploadForm/CardStylePicker';
import styles from './ExploreCard.module.css';

export function ExploreCard() {
  const { data } = useUserLocals();
  const viewedRef = useRef(false);

  const [cardStyle, setCardStyle] = useState<string>(
    () => globalThis.localStorage?.getItem(CARD_STYLE_KEY) ?? DEFAULT_CARD_STYLE
  );

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('photo_entry_point_viewed', { surface: 'upload_page' });
  }, []);

  const handleCardStyleChange = (value: string) => {
    globalThis.localStorage?.setItem(CARD_STYLE_KEY, value);
    setCardStyle(value);
  };

  const isPaying = isPayingUser(data?.locals);
  const showFreePlanHint = data != null && !isPaying;

  return (
    <section className={styles.wrapper} aria-labelledby="explore-card-heading">
      <header className={styles.header}>
        <h2 id="explore-card-heading" className={styles.heading}>
          Beyond the defaults
        </h2>
        <p className={styles.sub}>
          Three things most people miss on their first upload.
        </p>
      </header>
      <ul className={styles.card}>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>Card style</p>
            <p className={styles.rowDescription}>
              Cloze fills in the blank. Q&amp;A puts the question on the front.
            </p>
          </div>
          <div className={styles.rowAffordance}>
            <CardStylePicker value={cardStyle} onChange={handleCardStyleChange} />
          </div>
        </li>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>Photo to deck</p>
            <p className={styles.rowDescription}>
              Snap a textbook page, lecture slide, or handwritten notes — we&apos;ll make the cards.
            </p>
            {showFreePlanHint && (
              <p className={styles.rowHint}>Free plan: 5 photos per month</p>
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
              Open photo to deck
            </Link>
          </div>
        </li>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>Deck defaults</p>
            <p className={styles.rowDescription}>
              Change deck names, templates, and conversion options.
            </p>
          </div>
          <div className={styles.rowAffordance}>
            <Link
              to="/card-options?returnTo=/upload"
              className={styles.linkCta}
            >
              Open settings
            </Link>
          </div>
        </li>
      </ul>
    </section>
  );
}
