import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import {
  getPublicSharedDecks,
  PublicSharedDeck,
} from '../../lib/backend/getSharedDeck';
import sharedStyles from '../../styles/shared.module.css';
import styles from './SharedDecksPage.module.css';

export default function SharedDecksPage() {
  const { t } = useTranslation('previews');
  const [decks, setDecks] = useState<PublicSharedDeck[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicSharedDecks(null)
      .then((page) => {
        if (cancelled) return;
        setDecks(page.decks);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    getPublicSharedDecks(nextCursor)
      .then((page) => {
        setDecks((prev) => [...prev, ...page.decks]);
        setNextCursor(page.nextCursor);
      })
      .catch(() => setError(true))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className={sharedStyles.page}>
      <Helmet>
        <title>{t('sharedLibrary.header')} - 2anki</title>
      </Helmet>
      <div className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>{t('sharedLibrary.header')}</h1>
        <p className={sharedStyles.subtitle}>{t('sharedLibrary.subtitle')}</p>
      </div>

      {loading && <SkeletonList count={6} />}

      {!loading && error && (
        <p className={styles.errorText}>{t('sharedLibrary.loadFailed')}</p>
      )}

      {!loading && !error && decks.length === 0 && (
        <EmptyState
          icon="📚"
          title={t('sharedLibrary.emptyTitle')}
          description={t('sharedLibrary.emptyDescription')}
          actionLabel={t('sharedLibrary.emptyAction')}
          actionHref="/upload"
        />
      )}

      {!loading && decks.length > 0 && (
        <>
          <div className={styles.grid}>
            {decks.map((deck) => (
              <div key={deck.token} className={styles.deckCard}>
                <p
                  className={styles.deckTitle}
                  title={deck.title ?? undefined}
                  data-hj-suppress
                >
                  {deck.title}
                </p>
                {deck.card_count != null && (
                  <p className={styles.cardCount}>
                    {t('sharedLibrary.cardCount', { count: deck.card_count })}
                  </p>
                )}
                <a
                  href={`/s/${deck.token}`}
                  className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline} ${styles.viewLink}`}
                >
                  {t('sharedLibrary.viewDeck')}
                </a>
              </div>
            ))}
          </div>

          {nextCursor != null && (
            <div className={styles.loadMoreRow}>
              <button
                type="button"
                className={sharedStyles.btnSecondary}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {t('sharedLibrary.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
