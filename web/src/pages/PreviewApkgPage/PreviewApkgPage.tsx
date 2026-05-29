import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CardEditState, EditPayload } from './cardEditTypes';
import { downloadEditedApkg } from './downloadEditedApkg';

function indent(depth: number): string {
  if (depth <= 0) return '';
  return `${'  '.repeat(depth)}↳ `;
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
  const [editMap, setEditMap] = useState<Map<number, CardEditState>>(new Map());
  const [downloading, setDownloading] = useState(false);

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

  useEffect(() => {
    const hasEdits = editMap.size > 0;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    if (hasEdits) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editMap]);

  const cards = useMemo(
    () => stream.data?.pages.flatMap((page) => page.cards) ?? [],
    [stream.data]
  );

  const { deletedCount, suspendedCount } = useMemo(() => {
    let deleted = 0;
    let suspended = 0;
    Array.from(editMap.values()).forEach((state) => {
      if (state.deleted) deleted++;
      if (state.suspended && !state.deleted) suspended++;
    });
    return { deletedCount: deleted, suspendedCount: suspended };
  }, [editMap]);

  const handleEdit = useCallback((index: number, state: CardEditState) => {
    setEditMap((prev) => {
      const next = new Map(prev);
      next.set(index, state);
      return next;
    });
  }, []);

  const handleRestoreAll = useCallback(() => {
    setEditMap(new Map());
  }, []);

  async function handleDownload() {
    if (!key) return;
    setDownloading(true);
    try {
      const edits: EditPayload[] = Array.from(editMap.entries()).map(
        ([cardIndex, state]) => ({
          cardIndex,
          front: state.front,
          back: state.back,
          deleted: state.deleted,
          suspended: state.suspended,
        })
      );
      await downloadEditedApkg(key, edits);
    } catch (err) {
      setError(err as Error);
    } finally {
      setDownloading(false);
    }
  }

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
  const totalAll = meta.data?.totalCards ?? 0;
  const loadedCount = cards.length;
  const decks = Array.isArray(meta.data?.decks) ? meta.data.decks : [];
  const selectedDeck = decks.find((d) => d.id === deckId) ?? null;
  const isApkgKey = key.endsWith('.apkg');
  const hasEdits = editMap.size > 0;
  const activeCards = totalAll - deletedCount;

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <Link to="/downloads" className={styles.backLink}>
            ← Back to downloads
          </Link>
          {isApkgKey && (
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
              {totalAll === 0
                ? 'Loading your deck'
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
        {isApkgKey && totalAll > 0 && (
          <div className={styles.editStrip}>
            <span>
              <span className={styles.editStripCount}>{totalAll}</span> cards
              {deletedCount > 0 && (
                <>
                  {' · '}
                  <span className={styles.editStripCount}>{deletedCount}</span> deleted
                </>
              )}
              {suspendedCount > 0 && (
                <>
                  {' · '}
                  <span className={styles.editStripCount}>{suspendedCount}</span> suspended
                </>
              )}
            </span>
            {hasEdits && (
              <button
                type="button"
                className={styles.restoreButton}
                onClick={handleRestoreAll}
              >
                Restore all
              </button>
            )}
            <button
              type="button"
              className={styles.downloadButton}
              onClick={handleDownload}
              disabled={downloading}
            >
              {hasEdits
                ? `Download deck (${activeCards} cards)`
                : 'Download deck'}
            </button>
          </div>
        )}
      </header>

      {stream.isLoading && cards.length === 0 ? (
        <SkeletonList count={4} />
      ) : (
        <div className={styles.cards}>
          {cards.length === 0 && (
            <EmptyState
              title="Empty deck"
              description="This deck has no cards to preview."
            />
          )}
          {cards.map((card, idx) => (
            <CardFrame
              key={card.id}
              card={card}
              cardIndex={idx}
              editState={editMap.get(idx)}
              onEdit={handleEdit}
              isEditable={isApkgKey}
            />
          ))}
        </div>
      )}

      <div
        ref={sentinelRef}
        className={styles.sentinel}
        aria-hidden="true"
      />

      {stream.isFetchingNextPage && (
        <div className={styles.loadingRow}>Loading more cards</div>
      )}
    </div>
  );
}
