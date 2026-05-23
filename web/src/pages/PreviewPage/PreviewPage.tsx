import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import sharedStyles from '../../styles/shared.module.css';
import styles from './PreviewPage.module.css';
import { usePreviewStream } from './usePreviewStream';
import { BlockNode } from './BlockNode';

interface PreviewPageProps {
  setError: ErrorHandlerType;
}

export default function PreviewPage({ setError }: Readonly<PreviewPageProps>) {
  const { id } = useParams<{ id: string }>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = usePreviewStream(id);

  useEffect(() => {
    if (error) setError(error);
  }, [error, setError]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const firstPage = data?.pages?.[0];
  const pageTitle = firstPage?.pageTitle ?? 'Loading…';
  const pageUrl = firstPage?.pageUrl;
  const returnTo = encodeURIComponent(`/preview/${id}`);
  const rulesHref = `/rules/${id}?returnTo=${returnTo}`;

  const blocks = useMemo(
    () => data?.pages.flatMap((page) => page.blocks) ?? [],
    [data]
  );

  const tally = useMemo(() => {
    const hasDecisions = blocks.some((b) => b.decision != null);
    if (!hasDecisions) return null;
    return {
      cards: blocks.filter((b) => b.decision === 'card').length,
      skipped: blocks.filter((b) => b.decision === 'skip').length,
      recurse: blocks.filter((b) => b.decision === 'recurse').length,
    };
  }, [blocks]);

  const handleConvert = () => {
    if (converting || id == null) return;
    setConverting(true);
    get2ankiApi()
      .convert(id, 'page', pageTitle)
      .then(async (response) => {
        if (response.status === 202) {
          navigate('/downloads');
        } else {
          const text = await response.text().catch(() => '');
          if (text) setError(new Error(text));
          setConverting(false);
        }
      })
      .catch((err: unknown) => {
        setError(err as Error);
        setConverting(false);
      });
  };

  if (!id) {
    return (
      <div className={sharedStyles.page}>
        <p className={styles.empty}>Missing page id.</p>
      </div>
    );
  }

  if (error && !data) {
    const isNotFound = error.message.includes('404');
    if (isNotFound) {
      return (
        <div className={sharedStyles.page}>
          <header className={sharedStyles.pageHeader}>
            <h1 className={sharedStyles.title}>Preview</h1>
          </header>
          <EmptyState
            title="This page is no longer available"
            description="It was deleted in Notion, or the integration lost access."
          />
          <div className={styles.actionsRow}>
            <Link to="/notion" className={sharedStyles.btnPrimary}>
              Notion search
            </Link>
            <Link to="/downloads" className={sharedStyles.btnSecondary}>
              My Decks
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Preview</h1>
        </header>
        <ErrorPresenter error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <Link to="/notion" className={styles.backLink}>
          ← Back to Notion search
        </Link>
        <h1 className={sharedStyles.title} data-hj-suppress>
          {pageTitle}
        </h1>
        {pageUrl && (
          <p className={styles.pageLink}>
            <a href={pageUrl} target="_blank" rel="noreferrer">
              Open in Notion ↗
            </a>
          </p>
        )}
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={sharedStyles.btnPrimary}
            onClick={handleConvert}
            disabled={converting}
          >
            {converting ? 'Converting…' : 'Convert to Anki'}
          </button>
          <Link to={rulesHref} className={sharedStyles.btnSecondary}>
            Edit conversion rules
          </Link>
        </div>
      </header>

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : (
        <article className={styles.preview}>
          {tally && (
            <div className={styles.tally}>
              <span className={styles.tallyItem}>
                <span className={`${styles.tallySwatch} ${styles.tallySwatchCard}`} aria-hidden="true" />
                {tally.cards} {tally.cards === 1 ? 'card' : 'cards'}
              </span>
              <span className={styles.tallyItem}>
                <span className={`${styles.tallySwatch} ${styles.tallySwatchSkip}`} aria-hidden="true" />
                {tally.skipped} skipped
              </span>
              <span className={styles.tallyItem}>
                <span className={`${styles.tallySwatch} ${styles.tallySwatchRecurse}`} aria-hidden="true" />
                {tally.recurse} {tally.recurse === 1 ? 'sub-page' : 'sub-pages'}
              </span>
              {hasNextPage && (
                <span className={styles.tallyLoading}>+ loading more</span>
              )}
            </div>
          )}
          <p className={styles.muted}>
            Showing how your page will be split into cards. Blocks marked in blue become cards —{' '}
            adjust them with <Link to={rulesHref}>Edit conversion rules</Link>.
          </p>
          {blocks.length === 0 && (
            <EmptyState
              icon="📄"
              title="Nothing to preview"
              description="This page has no blocks to preview."
            />
          )}
          {blocks.map((block) => (
            <BlockNode key={block.id} block={block} />
          ))}
        </article>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {isFetchingNextPage && (
        <div className={styles.loadingRow}>Loading more…</div>
      )}
    </div>
  );
}
