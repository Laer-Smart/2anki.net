import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import useUploads from './hooks/useUploads';
import useJobs from './hooks/useJobs';
import useDropboxUploads from './hooks/useDropboxUploads';
import useGoogleDriveUploads from './hooks/useGoogleDriveUploads';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { EmptyDownloadsSection } from './components/EmptyDownloadsSection';
import { redirectOnError } from '../../components/shared/redirectOnError';
import { PaywallBanner } from './components/PaywallBanner';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { toDeckRows, DeckRow } from './helpers/toDeckRows';
import { getDistance } from '../../lib/getDistance';
import DownloadIcon from '../../components/icons/DownloadIcon';
import EyeIcon from '../../components/icons/EyeIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import { StatusTag, JobStatus } from './components/ListJobs/StatusTag';
import { StepIndicator } from '../../components/StepIndicator/StepIndicator';
import { jobStepFromStatus } from '../../components/StepIndicator/jobStepFromStatus';
import SendToAnkifyButton from './components/SendToAnkifyButton';
import { DeckFeedbackPrompt, isDeckFeedbackSuppressed } from './components/DeckFeedbackPrompt';
import { useActiveShares } from './hooks/useActiveShares';
import { fireAnalyticsEvent } from '../../lib/analytics/fireAnalyticsEvent';
import { track } from '../../lib/analytics/track';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { UpsellCard } from '../../components/UpsellCard';
import JobResponse from '../../schemas/public/JobResponse';
import { NotionColumnMappingModal } from '../../components/NotionColumnMappingModal/NotionColumnMappingModal';
import { parseAmbiguousColumnsPayload, type FieldMapping } from '../../lib/fieldMapping/types';
import styles from './DownloadsPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface DownloadsPageProps {
  setError: ErrorHandlerType;
}

type FilterValue = 'all' | 'ready' | 'in-progress' | 'failed' | 'dropbox' | 'drive';

const VALID_FILTERS = new Set<FilterValue>(['all', 'ready', 'in-progress', 'failed', 'dropbox', 'drive']);
const APKG_PATTERN = /\.apkg$/i;
const ACTIVE_STATUSES = new Set(['done', 'failed', 'cancelled', 'interrupted']);

function isActiveJob(status: string): boolean {
  return !ACTIVE_STATUSES.has(status);
}

function isFailedJob(status: string): boolean {
  return ['failed', 'cancelled', 'interrupted'].includes(status);
}

function isDoneJob(status: string): boolean {
  return status === 'done';
}

function getSourceLabel(source: DeckRow['source']): string {
  switch (source) {
    case 'notion': return 'Notion';
    case 'upload': return 'Upload';
    case 'dropbox': return 'Dropbox';
    case 'drive': return 'Drive';
  }
}

function applyFilter(rows: DeckRow[], filter: FilterValue): DeckRow[] {
  switch (filter) {
    case 'all':
      return rows;
    case 'ready':
      return rows.filter((r) => {
        if (r.kind === 'job') return isDoneJob(r.job.status);
        return true;
      });
    case 'in-progress':
      return rows.filter((r) => r.kind === 'job' && isActiveJob(r.job.status));
    case 'failed':
      return rows.filter((r) => r.kind === 'job' && isFailedJob(r.job.status));
    case 'dropbox':
      return rows.filter((r) => r.source === 'dropbox');
    case 'drive':
      return rows.filter((r) => r.source === 'drive');
  }
}

interface RenderJobStatusOptions {
  job: JobResponse;
  isExpanded: boolean;
  onToggle: () => void;
}

export function renderJobStatusCell(j: JobResponse) {
  if (isDoneJob(j.status)) {
    if (j.type === 'apkg_import') {
      let notionUrl: string | null = null;
      try {
        const parsed = JSON.parse(j.job_reason_failure ?? '');
        notionUrl = parsed.notion_page_url ?? null;
      } catch { /* not JSON */ }
      return notionUrl == null ? (
        <span>Done</span>
      ) : (
        <a href={notionUrl} target="_blank" rel="noopener noreferrer" className={styles.downloadButton}>
          Open in Notion
        </a>
      );
    }
    if (j.download_key != null) {
      return (
        <a
          href={`/api/download/u/${j.download_key}`}
          className={styles.iconButton}
          aria-label={`Download ${j.title}`}
          title="Download"
          onClick={() => { fireAnalyticsEvent('deck_downloaded'); track('deck_downloaded'); }}
        >
          <DownloadIcon width={18} height={18} />
        </a>
      );
    }
    return null;
  }
  if (isFailedJob(j.status)) {
    return <StatusTag status={j.status as JobStatus} />;
  }
  if (j.status === 'stale') {
    return <StatusTag status={j.status as JobStatus} />;
  }
  const { step, substep } = jobStepFromStatus(j.status);
  return <StepIndicator currentStep={step} substep={substep} compact />;
}

function renderJobStatusWithToggle({ job, isExpanded, onToggle }: RenderJobStatusOptions) {
  if (isFailedJob(job.status)) {
    return (
      <button
        type="button"
        className={styles.statusToggle}
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse failure reason' : 'Show failure reason'}
        aria-expanded={isExpanded}
      >
        <StatusTag status={job.status as JobStatus} />
        <span className={`${styles.statusChevron} ${isExpanded ? styles.statusChevronExpanded : ''}`}>
          ▾
        </span>
      </button>
    );
  }
  return renderJobStatusCell(job);
}

function isEmptyDeckError(message: string | null): boolean {
  if (message == null) return false;
  return message.includes('No cards in this deck yet');
}

function formatUpdatedLabel(lastFetchedAt: Date | null): string {
  if (lastFetchedAt == null) return '';
  return `Updated ${getDistance(lastFetchedAt)} ago`;
}

function FilterChip({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: FilterValue;
  active: boolean;
  onSelect: (v: FilterValue) => void;
}) {
  return (
    <button
      type="button"
      className={active ? `${sharedStyles.chip} ${sharedStyles.chipActive}` : sharedStyles.chip}
      onClick={() => onSelect(value)}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function DownloadsPage({ setError }: Readonly<DownloadsPageProps>) {
  const backend = get2ankiApi();
  const { deleteUpload, loading, uploads, error, refreshUploads } = useUploads(backend);
  const { jobs, deleteJob, restartJob, refreshJobs, lastFetchedAt } = useJobs(backend, setError);
  const { uploads: dropboxUploads, deleteUpload: deleteDropboxUpload } = useDropboxUploads(backend);
  const { uploads: googleDriveUploads, deleteUpload: deleteGoogleDriveUpload } = useGoogleDriveUploads(backend);
  const { data } = useUserLocals();
  const showUpgradeFooter = !isPayingUser(data?.locals);
  const activeShares = useActiveShares();
  const sharedKeySet = new Set(activeShares.map((s) => s.upload_key));

  const [searchParams, setSearchParams] = useSearchParams();
  const showPaywall = searchParams.get('paywall') === '1';
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(
    searchParams.get('verified') === '1'
  );
  const [expandedFailureJobId, setExpandedFailureJobId] = useState<number | string | null>(null);
  const [mappingModalJob, setMappingModalJob] = useState<JobResponse | null>(null);

  const rawFilter = searchParams.get('filter') ?? 'all';
  const activeFilter: FilterValue = VALID_FILTERS.has(rawFilter as FilterValue)
    ? (rawFilter as FilterValue)
    : 'all';

  useEffect(() => {
    if (searchParams.get('verified') !== '1') return;
    const params = new URLSearchParams(searchParams);
    params.delete('verified');
    setSearchParams(params, { replace: true });
    const timer = setTimeout(() => setShowVerifiedBanner(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const failedJobs = jobs.filter((j) => isFailedJob(j.status));
    if (failedJobs.length === 0) return;

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const recentFailedJob = failedJobs
      .filter((j) => {
        if (j.last_edited_time == null) return false;
        const lastEditedDate = new Date(j.last_edited_time);
        return lastEditedDate >= tenMinutesAgo;
      })
      .sort((a, b) => {
        const dateA = new Date(a.last_edited_time!).getTime();
        const dateB = new Date(b.last_edited_time!).getTime();
        return dateB - dateA;
      })[0];

    if (recentFailedJob != null) {
      setExpandedFailureJobId(recentFailedJob.id);
    }
  }, [jobs]);

  const setFilter = (value: FilterValue) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    setSearchParams(params, { replace: true });
  };

  const handleMappingSubmit = useCallback(
    async (mapping: FieldMapping) => {
      if (mappingModalJob == null) return;
      setMappingModalJob(null);
      await backend.convert(
        mappingModalJob.object_id,
        mappingModalJob.type,
        mappingModalJob.title,
        mapping
      );
      track('notion_column_mapping_submitted');
      await refreshJobs();
    },
    [mappingModalJob, backend, refreshJobs]
  );

  const activeJobs = jobs.filter((j) => isActiveJob(j.status));
  const hasDoneJob = jobs.some((j) => isDoneJob(j.status));
  const showDeckFeedback = hasDoneJob && !isDeckFeedbackSuppressed();

  const handleDeleteJob = async (id: Parameters<typeof deleteJob>[0]) => {
    await deleteJob(id);
    await refreshUploads();
  };

  const handleDeleteUpload = async (key: string) => {
    await deleteUpload(key);
    await refreshJobs();
  };

  if (error) {
    redirectOnError(error);
    return null;
  }

  const allRows = toDeckRows(jobs, uploads ?? [], dropboxUploads, googleDriveUploads);
  const filteredRows = applyFilter(allRows, activeFilter);

  const totalCount = allRows.length;
  const hasActiveJobs = activeJobs.length > 0;
  const isGloballyEmpty = totalCount === 0 && !hasActiveJobs;

  return (
    <div className={styles.page}>
      {showVerifiedBanner && (
        <div className={sharedStyles.alertSuccess} role="status" aria-live="polite">
          Email verified. You&apos;re all set.
        </div>
      )}
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.title}>My Decks</h1>
          <p className={styles.subtitle}>
            Decks you&apos;ve made, ready to download into Anki.
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <>
          {showPaywall && (
            <PaywallBanner inProgressJob={activeJobs[0] ?? null} />
          )}

          <EmptyDownloadsSection isEmpty={isGloballyEmpty && activeFilter === 'all'} />

          {(!isGloballyEmpty || activeFilter !== 'all') && (
            <div className={styles.section}>
              <div className={sharedStyles.flexWrap} style={{ marginBottom: '1rem' }}>
                <FilterChip label="All" value="all" active={activeFilter === 'all'} onSelect={setFilter} />
                <FilterChip label="Ready" value="ready" active={activeFilter === 'ready'} onSelect={setFilter} />
                <FilterChip label="In progress" value="in-progress" active={activeFilter === 'in-progress'} onSelect={setFilter} />
                <FilterChip label="Failed" value="failed" active={activeFilter === 'failed'} onSelect={setFilter} />
                <FilterChip label="From Dropbox" value="dropbox" active={activeFilter === 'dropbox'} onSelect={setFilter} />
                <FilterChip label="From Drive" value="drive" active={activeFilter === 'drive'} onSelect={setFilter} />
              </div>

              <div className={styles.card}>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Source</th>
                        <th>Created</th>
                        <th className={sharedStyles.actionColumnWide}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem 1rem' }}>
                            No decks match this filter.
                          </td>
                        </tr>
                      )}
                      {filteredRows.map((row) => {
                        if (row.kind === 'job') {
                          const isExpanded = expandedFailureJobId === row.job.id;
                          const isFailed = isFailedJob(row.job.status);
                          const toggleFailurePanel = () => {
                            setExpandedFailureJobId(isExpanded ? null : row.job.id);
                          };

                          return (
                            <>
                              <tr key={`job-${row.job.id}`} className={isFailed ? styles.failedRow : ''}>
                                <td>
                                  <span data-hj-suppress className={styles.fileName}>
                                    {row.job.title ?? '—'}
                                  </span>
                                </td>
                                <td>
                                  <span className={sharedStyles.badge}>
                                    {row.source === 'upload' && row.job.type === 'claude'
                                      ? 'AI-generated from upload'
                                      : getSourceLabel(row.source)}
                                  </span>
                                </td>
                                <td>
                                  {row.job.created_at != null && (
                                    <span className={styles.timeAgo}>
                                      {getDistance(row.job.created_at)} ago
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className={styles.actions}>
                                    {isDoneJob(row.job.status) && row.job.download_key != null && APKG_PATTERN.test(row.job.download_key) && (
                                      <Link
                                        to={`/preview/apkg/${encodeURIComponent(row.job.download_key)}`}
                                        className={styles.iconButton}
                                        aria-label={`Preview ${row.job.title ?? 'deck'}`}
                                        title="Preview"
                                      >
                                        <EyeIcon width={18} height={18} />
                                      </Link>
                                    )}
                                    {isFailed ? (
                                      renderJobStatusWithToggle({
                                        job: row.job,
                                        isExpanded,
                                        onToggle: toggleFailurePanel,
                                      })
                                    ) : (
                                      renderJobStatusCell(row.job)
                                    )}
                                    {row.source === 'notion' && isDoneJob(row.job.status) && row.job.upload_id != null && (
                                      <SendToAnkifyButton uploadId={row.job.upload_id} filename={row.job.title} />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteJob(row.job.id)}
                                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                      aria-label={`Delete ${row.job.title}`}
                                      title={isFailed ? 'Delete' : 'Cancel'}
                                    >
                                      <TrashIcon width={18} height={18} />
                                    </button>
                                    {isFailed && row.job.restartable && (
                                      <button
                                        type="button"
                                        onClick={() => restartJob(row.job)}
                                        className={styles.iconButton}
                                        aria-label="Restart job"
                                        title="Restart"
                                      >
                                        ↺
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isFailed && isExpanded && row.job.job_reason_failure != null && (
                                <tr key={`job-${row.job.id}-panel`}>
                                  <td colSpan={4} className={styles.failurePanel}>
                                    {parseAmbiguousColumnsPayload(row.job.job_reason_failure) == null ? (
                                      <>
                                        {row.job.job_reason_failure}
                                        {isEmptyDeckError(row.job.job_reason_failure) && (
                                          <div>
                                            <Link to="/documentation/help/common-problems" className={styles.failureLearnMore}>
                                              Learn more →
                                            </Link>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div>
                                        <p>
                                          This database has more than two columns. Pick which column should be the front and back of each card.
                                        </p>
                                        <button
                                          type="button"
                                          className={sharedStyles.btnPrimary}
                                          onClick={() => setMappingModalJob(row.job)}
                                        >
                                          Map columns
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        }

                        if (row.kind === 'file') {
                          const u = row.upload;
                          const isShared = sharedKeySet.has(u.key);
                          const sharePreviewUrl = `/preview/apkg/${encodeURIComponent(u.key)}`;
                          return (
                            <tr key={`upload-${u.key}`}>
                              <td>
                                <span data-hj-suppress className={styles.fileName}>
                                  {u.filename}
                                </span>
                                {isShared && (
                                  <Link
                                    to={sharePreviewUrl}
                                    className={sharedStyles.badge}
                                    style={{ marginLeft: '0.5rem', textDecoration: 'none' }}
                                    title="Shared — click to open preview"
                                  >
                                    Shared
                                  </Link>
                                )}
                              </td>
                              <td>
                                <span className={sharedStyles.badge}>Upload</span>
                              </td>
                              <td>
                                {u.created_at != null && (
                                  <span className={styles.timeAgo}>
                                    {getDistance(u.created_at)} ago
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className={styles.actions}>
                                  {APKG_PATTERN.test(u.key) && (
                                    <Link
                                      to={`/preview/apkg/${encodeURIComponent(u.key)}`}
                                      className={styles.iconButton}
                                      aria-label={`Preview ${u.filename}`}
                                      title="Preview"
                                    >
                                      <EyeIcon width={18} height={18} />
                                    </Link>
                                  )}
                                  <a
                                    href={`/api/download/u/${u.key}`}
                                    className={styles.iconButton}
                                    aria-label={`Download ${u.filename}`}
                                    title="Download"
                                    onClick={() => { fireAnalyticsEvent('deck_downloaded'); track('deck_downloaded'); }}
                                  >
                                    <DownloadIcon width={18} height={18} />
                                  </a>
                                  {APKG_PATTERN.test(u.key) && (
                                    <SendToAnkifyButton uploadId={u.id} filename={u.filename} />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUpload(u.key)}
                                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                    aria-label={`Delete ${u.filename}`}
                                    title="Delete"
                                  >
                                    <TrashIcon width={18} height={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (row.kind === 'dropbox') {
                          const d = row.upload;
                          return (
                            <tr key={`dropbox-${d.id}`}>
                              <td>
                                <span data-hj-suppress className={styles.fileName} title={d.name}>
                                  {d.name.length > 40 ? `${d.name.slice(0, 40)}…` : d.name}
                                </span>
                              </td>
                              <td>
                                <span className={sharedStyles.badge}>Dropbox</span>
                              </td>
                              <td>
                                {d.created_at != null && (
                                  <span className={styles.timeAgo}>
                                    {getDistance(d.created_at)} ago
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className={styles.actions}>
                                  <button
                                    type="button"
                                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                    onClick={() => deleteDropboxUpload(d.id)}
                                    aria-label={`Remove ${d.name}`}
                                    title="Remove"
                                  >
                                    <TrashIcon width={18} height={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (row.kind === 'drive') {
                          const g = row.upload;
                          return (
                            <tr key={`drive-${g.id}`}>
                              <td>
                                <span data-hj-suppress className={styles.fileName} title={g.name}>
                                  {g.name.length > 40 ? `${g.name.slice(0, 40)}…` : g.name}
                                </span>
                              </td>
                              <td>
                                <span className={sharedStyles.badge}>Drive</span>
                              </td>
                              <td>
                                {g.last_converted_at != null && (
                                  <span className={styles.timeAgo}>
                                    {getDistance(g.last_converted_at)} ago
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className={styles.actions}>
                                  <button
                                    type="button"
                                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                                    onClick={() => deleteGoogleDriveUpload(g.id)}
                                    aria-label={`Remove ${g.name}`}
                                    title="Remove"
                                  >
                                    <TrashIcon width={18} height={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return null;
                      })}
                    </tbody>
                  </table>
                </div>
                {showUpgradeFooter && !isGloballyEmpty && (
                  <div className={styles.upgradeFooter}>
                    <UpsellCard surface="downloads_upsell" />
                  </div>
                )}
                {showDeckFeedback && <DeckFeedbackPrompt />}
              </div>

              <div style={{ textAlign: 'right', marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {formatUpdatedLabel(lastFetchedAt)}
              </div>
            </div>
          )}
        </>
      )}
      {mappingModalJob != null && (() => {
        const payload = parseAmbiguousColumnsPayload(mappingModalJob.job_reason_failure);
        if (payload == null) return null;
        return (
          <NotionColumnMappingModal
            isOpen
            columns={payload.columns}
            suggested={payload.suggested}
            onSubmit={handleMappingSubmit}
            onCancel={() => setMappingModalJob(null)}
          />
        );
      })()}
    </div>
  );
}
