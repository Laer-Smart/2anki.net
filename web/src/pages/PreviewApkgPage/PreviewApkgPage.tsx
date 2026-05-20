import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import sharedStyles from '../../styles/shared.module.css';
import styles from './PreviewApkgPage.module.css';
import {
  useApkgPreviewMeta,
  useApkgPreviewStream,
} from './useApkgPreviewStream';
import { CardFrame } from './CardFrame';
import { SharePopover } from './SharePopover';

function indent(depth: number): string {
  if (depth <= 0) return '';
  return `${'\u00a0\u00a0'.repeat(depth)}↳ `;
}

interface PreviewApkgPageProps {
  setError: ErrorHandlerType;
}

export default function PreviewApkgPage({
  setError,
}: Readonly<PreviewApkgPageProps>) {
  const { key } = useParams<{ key: string }>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [deckId, setDeckId] = useState<number | null>(null);

  const meta = useApkgPreviewMeta(key);
  const stream = useApkgPreviewStream(key, deckId);

  useEffect(() => {
    const firstError = stream.error ?? meta.error;
    if (firstError) setError(firstError);
  }, [stream.error, meta.error, setError]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          stream.hasNextPage &&
          !stream.isFetchingNextPage
        ) {
          stream.fetchNextPage();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [stream]);

  const cards = useMemo(
    () => stream.data?.pages.flatMap((page) => page.cards) ?? [],
    [stream.data]
  );

  if (!key) {
    return (
      <div className={sharedStyles.page}>
        <p className={styles.empty}>Missing upload id.</p>
      </div>
    );
  }

  const fatal = stream.error && !stream.data;
  if (fatal) {
    return (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <Link to="/downloads" className={styles.backLink}>
            ← Back to downloads
          </Link>
          <h1 className={sharedStyles.title}>Preview</h1>
        </header>
        <ErrorPresenter
          error={stream.error as Error}
          onRetry={() => stream.refetch()}
        />
      </div>
    );
  }

  const filteredTotal = stream.data?.pages[0]?.total;
  const totalAll = meta.data?.totalCards;
  const loadedCount = cards.length;
  const decks = Array.isArray(meta.data?.decks) ? meta.data.decks : [];
  const selectedDeck = decks.find((d) => d.id === deckId) ?? null;

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <Link to="/downloads" className={styles.backLink}>
            ← Back to downloads
          </Link>
          {key?.endsWith('.apkg') && (
            <SharePopover uploadKey={key} />
          )}
        </div>
        <h1 className={sharedStyles.title} data-hj-suppress>
          Deck preview
        </h1>
        <p className={styles.summary}>
          {selectedDeck ? (
            <>
              {selectedDeck.fullName} · {loadedCount} of{' '}
              {filteredTotal ?? selectedDeck.cardCount} cards loaded
            </>
          ) : (
            <>
              {decks.length > 1 ? `${decks.length} decks · ` : ''}
              {totalAll == null
                ? 'Loading…'
                : `${loadedCount} of ${totalAll} cards loaded`}
            </>
          )}
        </p>
        {decks.length > 1 && (
          <label className={styles.deckFilter}>
            <span>Deck:</span>
            <select
              value={deckId ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                setDeckId(raw === '' ? null : Number.parseInt(raw, 10));
              }}
            >
              <option value="">All decks ({totalAll ?? '…'} cards)</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {indent(Math.max(0, deck.path.length - 1))}
                  {deck.path[deck.path.length - 1] ?? deck.fullName} (
                  {deck.cardCount})
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {stream.isLoading && cards.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <div className={styles.cards}>
          {cards.length === 0 && (
            <EmptyState
              icon="🃏"
              title="Empty deck"
              description="This deck has no cards to preview."
            />
          )}
          {cards.map((card) => (
            <CardFrame key={card.id} card={card} />
          ))}
        </div>
      )}

      <div
        ref={sentinelRef}
        className={styles.sentinel}
        aria-hidden="true"
      />

      {stream.isFetchingNextPage && (
        <div className={styles.loadingRow}>Loading more…</div>
      )}
    </div>
  );
}
