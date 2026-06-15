import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { UserNotice } from '../../lib/errors/UserNotice';
import sharedStyles from '../../styles/shared.module.css';
import styles from './PreviewPage.module.css';
import { usePreviewStream } from './usePreviewStream';
import { BlockNode } from './BlockNode';
import InfoIcon from '../../components/icons/InfoIcon';
import ExternalLinkIcon from '../../components/icons/ExternalLinkIcon';
import SettingsIcon from '../../components/icons/SettingsIcon';

interface PreviewPageProps {
  setError: ErrorHandlerType;
}

interface LocationState {
  parentTitle?: string;
}

export default function PreviewPage({ setError }: Readonly<PreviewPageProps>) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [converting, setConverting] = useState(false);

  const locationState = location.state as LocationState | null;
  const parentTitle = locationState?.parentTitle;

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
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
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
      .then((response) => {
        if (response.status === 202) {
          navigate('/downloads');
          return;
        }
        if (response.status === 409) {
          setError(
            new UserNotice(
              'This page is already converting — check Downloads in a moment.'
            )
          );
          setConverting(false);
          return;
        }
        const fallbackMessage =
          'Could not start the conversion. Try again in a moment.';
        const isServerError = response.status >= 500;
        setError(
          isServerError
            ? new Error(fallbackMessage)
            : new UserNotice(fallbackMessage)
        );
        setConverting(false);
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

  const backLabel = parentTitle
    ? `← Back to ${parentTitle}`
    : '← Back to Notion search';

  return (
    <div className={sharedStyles.page}>
      <p className={styles.intro}>
        <span className={styles.introIcon} aria-hidden="true">
          <InfoIcon width={18} height={18} />
        </span>
        <span>
          Showing how your page will be split into cards. Blocks marked in blue
          become cards — adjust them with{' '}
          <Link to={rulesHref}>Edit conversion rules</Link>.
        </span>
      </p>

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : (
        <article className={styles.preview}>
          <div className={styles.backRow}>
            {parentTitle ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={styles.backLink}
              >
                {backLabel}
              </button>
            ) : (
              <Link to="/notion" className={styles.backLink}>
                {backLabel}
              </Link>
            )}
          </div>

          <div className={styles.titleRow}>
            <h1 className={sharedStyles.title} data-hj-suppress>
              {pageTitle}
            </h1>
            <span className={styles.headerLinks}>
              <button
                type="button"
                className={sharedStyles.btnPrimary}
                onClick={handleConvert}
                disabled={converting}
              >
                {converting ? 'Converting…' : 'Convert to Anki'}
              </button>
              {pageUrl && (
                <a
                  className={styles.pageLink}
                  href={pageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLinkIcon width={16} height={16} />
                  <span>Open in Notion</span>
                </a>
              )}
              <Link to={rulesHref} className={styles.pageLink}>
                <SettingsIcon />
                <span>Edit conversion rules</span>
              </Link>
            </span>
          </div>

          <div className={styles.previewBody}>
            {tally && (
              <div className={styles.tally}>
                <span className={styles.tallyItem}>
                  <span
                    className={`${styles.tallySwatch} ${styles.tallySwatchCard}`}
                    aria-hidden="true"
                  />
                  {tally.cards} cards
                </span>
                <span className={styles.tallyItem}>
                  <span
                    className={`${styles.tallySwatch} ${styles.tallySwatchSkip}`}
                    aria-hidden="true"
                  />
                  {tally.skipped} skipped
                </span>
                <span className={styles.tallyItem}>
                  <span
                    className={`${styles.tallySwatch} ${styles.tallySwatchRecurse}`}
                    aria-hidden="true"
                  />
                  {tally.recurse}{' '}
                  {tally.recurse === 1 ? 'sub-page' : 'sub-pages'}
                </span>
                {hasNextPage && (
                  <span className={styles.tallyLoading}>+ loading more…</span>
                )}
              </div>
            )}
            {blocks.length === 0 && (
              <EmptyState
                icon="📄"
                title="Nothing to turn into cards yet"
                description="2anki makes a card from every toggle on this page — the toggle title becomes the question, what's inside becomes the answer. This page has no toggles yet. Add a few in Notion, then preview again."
                actionLabel="See how toggles become cards"
                actionHref="/documentation/cards/notion-blocks"
              />
            )}
            {blocks.map((block) => (
              <BlockNode key={block.id} block={block} parentTitle={pageTitle} />
            ))}
          </div>
        </article>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {isFetchingNextPage && (
        <div className={styles.loadingRow}>Loading more…</div>
      )}
    </div>
  );
}
