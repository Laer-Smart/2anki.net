import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
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

  const backLabel = parentTitle ? `← Back to ${parentTitle}` : '← Back to Notion search';

  return (
    <div className={sharedStyles.page}>
      <p className={styles.intro}>
        <span className={styles.introIcon} aria-hidden="true">
          <InfoIcon width={18} height={18} />
        </span>
        <span>
          This is the page as the converter reads it during conversion.{' '}
          <Link to={rulesHref}>Edit conversion rules</Link> to change which
          blocks become cards.
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
            {blocks.length === 0 && (
              <EmptyState
                icon="📄"
                title="Nothing to preview"
                description="This page has no blocks to preview."
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
