import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { ErrorGroup, ErrorSort, ErrorSource, ErrorStatus } from './errorsTypes';
import { useErrorGroups } from './useErrorGroups';
import { buildCopyArtifact } from './buildCopyArtifact';
import CopyForClaudeButton from './CopyForClaudeButton';
import { buildExportErrorsUrl } from './exportErrorsUrl';
import { parseUserAgent } from './parseUserAgent';
import { resolveErrorGroup, reopenErrorGroup } from './resolveErrorGroup';
import { ERROR_PAGE_SIZE, resolveErrorPage } from './errorPagination';

const SOURCE_OPTIONS: { value: ErrorSource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'server', label: 'Server' },
];

const STATUS_OPTIONS: { value: ErrorStatus; label: string }[] = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

const filterLabelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-tertiary)',
  width: '3.5rem',
  flexShrink: 0,
};

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function SourceDot({ source }: Readonly<{ source: string }>) {
  const color = source === 'server' ? '#f59e0b' : '#3b82f6';
  return (
    <span
      aria-label={source}
      style={{
        display: 'inline-block',
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

interface DetailPanelProps {
  group: ErrorGroup;
  onClose: () => void;
  onResolutionChange: () => void;
}

function DetailPanel({
  group,
  onClose,
  onResolutionChange,
}: Readonly<DetailPanelProps>) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const toggleResolution = () => {
    setBusy(true);
    setActionError(null);
    const action = group.resolved ? reopenErrorGroup : resolveErrorGroup;
    action(group.message_hash)
      .then(() => onResolutionChange())
      .catch((e: unknown) =>
        setActionError(e instanceof Error ? e.message : 'Action failed')
      )
      .finally(() => setBusy(false));
  };

  const release =
    group.release == null ? '(unknown)' : group.release.slice(0, 8);
  const userId = group.user_id == null ? 'anonymous' : String(group.user_id);
  const browser =
    group.source === 'web' ? parseUserAgent(group.user_agent) : null;

  return (
    <aside
      style={{
        flex: '0 0 400px',
        maxWidth: '400px',
        borderLeft: '1px solid var(--color-border)',
        padding: '1rem 1.25rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
          }}
        >
          Error detail
        </h3>
        <button
          type="button"
          className={sharedStyles.btnSmall}
          aria-label="Close detail panel"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          wordBreak: 'break-word',
        }}
      >
        {group.message}
      </p>

      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: '7rem 1fr',
          gap: '0.3rem 0.5rem',
          fontSize: 'var(--text-xs)',
        }}
      >
        <dt style={{ color: 'var(--color-text-tertiary)' }}>Source</dt>
        <dd style={{ margin: 0 }}>{group.source}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Occurrences</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          {group.occurrences}
        </dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>First seen</dt>
        <dd style={{ margin: 0 }}>
          {new Date(group.first_seen).toUTCString()}
        </dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Last seen</dt>
        <dd style={{ margin: 0 }}>{new Date(group.last_seen).toUTCString()}</dd>

        {group.resolved && group.resolved_at != null && (
          <>
            <dt style={{ color: 'var(--color-text-tertiary)' }}>Resolved</dt>
            <dd style={{ margin: 0 }}>
              {new Date(group.resolved_at).toUTCString()}
            </dd>
          </>
        )}

        <dt style={{ color: 'var(--color-text-tertiary)' }}>URL</dt>
        <dd style={{ margin: 0, wordBreak: 'break-all' }}>
          {group.url ?? '(none)'}
        </dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Release</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>
          {release}
        </dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>User</dt>
        <dd style={{ margin: 0 }}>{userId}</dd>

        {browser != null && (
          <>
            <dt style={{ color: 'var(--color-text-tertiary)' }}>Browser</dt>
            <dd style={{ margin: 0 }}>{browser}</dd>
          </>
        )}
      </dl>

      {group.stack != null && (
        <div>
          <p
            style={{
              margin: '0 0 0.25rem',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Stack
          </p>
          <pre
            style={{
              margin: 0,
              fontSize: '0.7rem',
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {group.stack}
          </pre>
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '0.5rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <CopyForClaudeButton getText={() => buildCopyArtifact(group)} />
        <button
          type="button"
          className={sharedStyles.btnSmall}
          disabled={busy}
          onClick={toggleResolution}
        >
          {group.resolved ? 'Reopen' : 'Resolve'}
        </button>
        {actionError != null && (
          <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626' }}>
            {actionError}
          </span>
        )}
      </div>
    </aside>
  );
}

export default function ErrorsTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSource = searchParams.get('source');
  const source: ErrorSource =
    rawSource === 'web' || rawSource === 'server' ? rawSource : 'all';
  const rawSort = searchParams.get('sort');
  const sort: ErrorSort =
    rawSort === 'occurrences' ? 'occurrences' : 'last_seen';
  const rawStatus = searchParams.get('status');
  const status: ErrorStatus =
    rawStatus === 'resolved' || rawStatus === 'all' ? rawStatus : 'unresolved';
  const selectedHash = searchParams.get('id');
  const rawPage = searchParams.get('page');
  const requestedPage = (() => {
    const parsed = Number(rawPage);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  })();

  const { data, isLoading, error, refetch } = useErrorGroups({
    source,
    sort,
    status,
    limit: ERROR_PAGE_SIZE,
    offset: requestedPage * ERROR_PAGE_SIZE,
  });

  const pageInfo = resolveErrorPage(rawPage, data?.totalGroups ?? 0);

  const selectedGroup =
    data?.groups.find((g) => g.message_hash === selectedHash) ?? null;

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value == null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  const setFilterParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value == null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    params.delete('id');
    setSearchParams(params, { replace: true });
  };

  const selectGroup = (hash: string | null) => updateParam('id', hash);
  const setSource = (s: ErrorSource) =>
    setFilterParam('source', s === 'all' ? null : s);
  const setStatus = (s: ErrorStatus) =>
    setFilterParam('status', s === 'unresolved' ? null : s);
  const toggleSort = () =>
    setFilterParam('sort', sort === 'last_seen' ? 'occurrences' : 'last_seen');
  const goToPage = (next: number) =>
    updateParam('page', next <= 0 ? null : String(next));

  const countLabel = status === 'all' ? 'total' : status;
  const groupPlural = data?.totalGroups === 1 ? '' : 's';
  const groupRangeLabel =
    data?.totalGroups === 0
      ? `0 ${countLabel} groups`
      : `${pageInfo.rangeStart}–${pageInfo.rangeEnd} of ${data?.totalGroups} ${countLabel} group${groupPlural}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        className={styles.tabHeader}
        style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
        >
          <div
            style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}
          >
            <span style={filterLabelStyle}>Status</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  status === opt.value
                    ? `${sharedStyles.btnSmallPill} ${sharedStyles.btnSmallPillActive ?? ''}`
                    : sharedStyles.btnSmallPill
                }
                style={
                  status === opt.value
                    ? { background: 'var(--color-primary)', color: '#fff' }
                    : {}
                }
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div
            style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}
          >
            <span style={filterLabelStyle}>Source</span>
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  source === opt.value
                    ? `${sharedStyles.btnSmallPill} ${sharedStyles.btnSmallPillActive ?? ''}`
                    : sharedStyles.btnSmallPill
                }
                style={
                  source === opt.value
                    ? { background: 'var(--color-primary)', color: '#fff' }
                    : {}
                }
                onClick={() => setSource(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            className={sharedStyles.btnSmall}
            href={buildExportErrorsUrl(status, source)}
            download
          >
            Download for Claude
          </a>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={toggleSort}
          >
            Sort: {sort === 'last_seen' ? 'last seen ↓' : 'occurrences ↓'}
          </button>
          <button
            type="button"
            className={`${sharedStyles.btnSmall} ${styles.refreshButton}`}
            onClick={() => refetch()}
          >
            Refresh
          </button>
        </div>
      </div>

      {error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          Failed to load errors: {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 0,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          minHeight: '300px',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && data == null && (
            <p className={styles.emptyHint} style={{ padding: '1.5rem' }}>
              Loading…
            </p>
          )}

          {!isLoading && data?.groups.length === 0 && (
            <p className={styles.emptyHint} style={{ padding: '1.5rem' }}>
              {status === 'unresolved'
                ? 'No unresolved errors. A resolved error reappears here if it happens again.'
                : 'No errors recorded. Errors appear here as soon as the client reports one.'}
            </p>
          )}

          {data != null && data.groups.length > 0 && (
            <div className={styles.tableScroll}>
              <table
                className={styles.table}
                style={{ tableLayout: 'fixed', minWidth: '40rem' }}
              >
                <colgroup>
                  <col style={{ width: '1.25rem' }} />
                  <col />
                  <col style={{ width: '10rem' }} />
                  <col style={{ width: '6rem' }} />
                  <col style={{ width: '5rem' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th aria-label="Source" />
                    <th>Message</th>
                    <th>URL</th>
                    <th>Last seen</th>
                    <th className={styles.numeric}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((group) => {
                    const isSelected = group.message_hash === selectedHash;
                    return (
                      <tr
                        key={group.message_hash}
                        style={{
                          cursor: 'pointer',
                          background: isSelected
                            ? 'var(--color-bg-secondary)'
                            : undefined,
                          opacity: group.resolved ? 0.55 : undefined,
                        }}
                        onClick={() =>
                          selectGroup(isSelected ? null : group.message_hash)
                        }
                      >
                        <td>
                          <SourceDot source={group.source} />
                        </td>
                        <td
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 'var(--text-xs)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={group.message}
                        >
                          {group.resolved && (
                            <span
                              style={{
                                fontFamily: 'inherit',
                                fontSize: '0.65rem',
                                fontWeight: 'var(--font-semibold)',
                                color: 'var(--color-text-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0 0.3rem',
                                marginRight: '0.4rem',
                              }}
                            >
                              Resolved
                            </span>
                          )}
                          {truncate(group.message, 80)}
                        </td>
                        <td
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={group.url ?? undefined}
                        >
                          {group.url == null ? '—' : truncate(group.url, 40)}
                        </td>
                        <td
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {relative(group.last_seen)}
                        </td>
                        <td className={styles.numeric}>{group.occurrences}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedGroup != null && (
          <DetailPanel
            group={selectedGroup}
            onClose={() => selectGroup(null)}
            onResolutionChange={refetch}
          />
        )}
      </div>

      {data != null && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {groupRangeLabel}
          </p>

          {pageInfo.pageCount > 1 && (
            <div
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <button
                type="button"
                className={sharedStyles.btnSmall}
                disabled={!pageInfo.hasPrev}
                onClick={() => goToPage(pageInfo.page - 1)}
              >
                Previous
              </button>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Page {pageInfo.page + 1} of {pageInfo.pageCount}
              </span>
              <button
                type="button"
                className={sharedStyles.btnSmall}
                disabled={!pageInfo.hasNext}
                onClick={() => goToPage(pageInfo.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
