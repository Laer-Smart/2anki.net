import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import sharedStyles from '../../styles/shared.module.css';
import styles from './PreviewPage.module.css';
import { usePreviewStream } from './usePreviewStream';
import { BlockNode } from './BlockNode';
import { PreviewSettings, classifyBlock } from '../../lib/preview/classifyBlock';
import { PreviewSettingsRail } from './PreviewSettings';

interface PreviewPageProps {
  setError: ErrorHandlerType;
}

interface LocationState {
  parentTitle?: string;
}

const DEFAULT_SETTINGS: PreviewSettings = {
  includeToggles: true,
  includeHeadings: false,
  recurseSubPages: true,
  columnsAsCards: false,
};

export default function PreviewPage({ setError }: Readonly<PreviewPageProps>) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<PreviewSettings>(DEFAULT_SETTINGS);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

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
  const convertHref = rulesHref;

  const rawBlocks = useMemo(
    () => data?.pages.flatMap((page) => page.blocks) ?? [],
    [data]
  );

  const blocks = useMemo(
    () =>
      rawBlocks.map((block) => ({
        ...block,
        decision: block.decision ?? classifyBlock(block, settings),
      })),
    [rawBlocks, settings]
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
      <header className={sharedStyles.pageHeader}>
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
          <Link to={rulesHref} className={sharedStyles.btnSecondary}>
            Conversion rules
          </Link>
        </div>
      </header>

      <button
        type="button"
        className={styles.mobileSettingsBtn}
        onClick={() => setMobileRailOpen(true)}
      >
        Settings
      </button>

      {mobileRailOpen && (
        <div className={styles.mobileOverlay}>
          <div className={styles.mobileOverlayHeader}>
            <strong>Card settings</strong>
            <button
              type="button"
              onClick={() => setMobileRailOpen(false)}
              className={styles.backLink}
            >
              Done
            </button>
          </div>
          <PreviewSettingsRail
            settings={settings}
            onChange={setSettings}
            convertHref={convertHref}
          />
        </div>
      )}

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : (
        <div className={styles.layoutShell}>
          <div className={styles.settingsRail}>
            <PreviewSettingsRail
              settings={settings}
              onChange={setSettings}
              convertHref={convertHref}
            />
          </div>

          <div className={styles.previewColumn}>
            <article className={styles.preview}>
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
          </div>
        </div>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {isFetchingNextPage && (
        <div className={styles.loadingRow}>Loading more…</div>
      )}
    </div>
  );
}
