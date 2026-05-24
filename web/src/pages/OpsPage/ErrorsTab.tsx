import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { ErrorGroup, ErrorSort, ErrorSource } from './errorsTypes';
import { useErrorGroups } from './useErrorGroups';
import { buildCopyArtifact } from './buildCopyArtifact';
import { parseUserAgent } from './parseUserAgent';

const SOURCE_OPTIONS: { value: ErrorSource; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'server', label: 'Server' },
];

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

interface CopyButtonProps {
  group: ErrorGroup;
}

function CopyButton({ group }: Readonly<CopyButtonProps>) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    const artifact = buildCopyArtifact(group);
    navigator.clipboard.writeText(artifact).then(() => {
      setCopied(true);
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [group]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={sharedStyles.btnSmall}
      onClick={handleCopy}
    >
      {copied ? 'Copied' : 'Copy for Claude Code'}
    </button>
  );
}

interface DetailPanelProps {
  group: ErrorGroup;
  onClose: () => void;
}

function DetailPanel({ group, onClose }: Readonly<DetailPanelProps>) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const release = group.release == null ? '(unknown)' : group.release.slice(0, 8);
  const userId = group.user_id == null ? 'anonymous' : String(group.user_id);
  const browser = group.source === 'web' ? parseUserAgent(group.user_agent) : null;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
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

      <p style={{ margin: 0, fontSize: 'var(--text-sm)', wordBreak: 'break-word' }}>
        {group.message}
      </p>

      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '7rem 1fr', gap: '0.3rem 0.5rem', fontSize: 'var(--text-xs)' }}>
        <dt style={{ color: 'var(--color-text-tertiary)' }}>Source</dt>
        <dd style={{ margin: 0 }}>{group.source}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Occurrences</dt>
        <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{group.occurrences}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>First seen</dt>
        <dd style={{ margin: 0 }}>{new Date(group.first_seen).toUTCString()}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Last seen</dt>
        <dd style={{ margin: 0 }}>{new Date(group.last_seen).toUTCString()}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>URL</dt>
        <dd style={{ margin: 0, wordBreak: 'break-all' }}>{group.url ?? '(none)'}</dd>

        <dt style={{ color: 'var(--color-text-tertiary)' }}>Release</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>{release}</dd>

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
          <p style={{ margin: '0 0 0.25rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Stack
          </p>
          <pre style={{
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
          }}>
            {group.stack}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
        <CopyButton group={group} />
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
  const sort: ErrorSort = rawSort === 'occurrences' ? 'occurrences' : 'last_seen';
  const selectedHash = searchParams.get('id');

  const { data, isLoading, error, refetch } = useErrorGroups({ source, sort });

  const selectedGroup = data?.groups.find((g) => g.message_hash === selectedHash) ?? null;

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value == null || value === '' ) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  const selectGroup = (hash: string | null) => updateParam('id', hash);
  const setSource = (s: ErrorSource) => updateParam('source', s === 'all' ? null : s);
  const toggleSort = () => updateParam('sort', sort === 'last_seen' ? 'occurrences' : 'last_seen');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        className={styles.tabHeader}
        style={{ justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={
                source === opt.value
                  ? `${sharedStyles.btnSmallPill} ${sharedStyles.btnSmallPillActive ?? ''}`
                  : sharedStyles.btnSmallPill
              }
              style={source === opt.value ? { background: 'var(--color-primary)', color: '#fff' } : {}}
              onClick={() => setSource(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: '300px' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && data == null && (
            <p className={styles.emptyHint} style={{ padding: '1.5rem' }}>Loading…</p>
          )}

          {!isLoading && data?.groups.length === 0 && (
            <p className={styles.emptyHint} style={{ padding: '1.5rem' }}>
              No errors recorded. Errors appear here as soon as the client reports one.
            </p>
          )}

          {data != null && data.groups.length > 0 && (
            <table className={styles.table} style={{ tableLayout: 'fixed' }}>
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
                        background: isSelected ? 'var(--color-bg-secondary)' : undefined,
                      }}
                      onClick={() => selectGroup(isSelected ? null : group.message_hash)}
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
          )}
        </div>

        {selectedGroup != null && (
          <DetailPanel
            group={selectedGroup}
            onClose={() => selectGroup(null)}
          />
        )}
      </div>

      {data != null && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {data.totalGroups} total group{data.totalGroups === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
