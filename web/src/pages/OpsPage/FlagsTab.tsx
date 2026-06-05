import { useCallback, useEffect, useState } from 'react';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import flagsStyles from './FlagsTab.module.css';

interface FeatureFlag {
  key: string;
  value: boolean;
  description: string | null;
  updated_at: string | null;
  updated_by_email: string | null;
}

type LoadState = 'idle' | 'loading' | 'error';

const formatRelative = (iso: string | null): string => {
  if (iso == null) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';
  const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'a moment ago';
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const loadFlags = async (): Promise<FeatureFlag[]> => {
  const response = await fetch('/api/ops/flags', { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`/api/ops/flags failed: ${response.status}`);
  }
  return response.json();
};

const updateFlag = async (
  key: string,
  value: boolean
): Promise<FeatureFlag> => {
  const response = await fetch(`/api/ops/flags/${encodeURIComponent(key)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
};

export default function FlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const data = await loadFlags();
      setFlags(data);
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = async (flag: FeatureFlag) => {
    const previous = flags;
    const nextValue = !flag.value;
    setFlags((current) =>
      current.map((f) => (f.key === flag.key ? { ...f, value: nextValue } : f))
    );
    setPendingKey(flag.key);
    setError(null);
    try {
      const updated = await updateFlag(flag.key, nextValue);
      setFlags((current) =>
        current.map((f) => (f.key === flag.key ? updated : f))
      );
    } catch (err) {
      setFlags(previous);
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <>
      <p className={styles.panelTitle}>Flags</p>
      <p className={styles.panelSubtitle}>
        Runtime feature flags. Toggling is logged and takes effect within 5
        seconds across the server. New flags get added via migration — this page
        only flips existing flags.
      </p>

      {state === 'error' && error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
          <button
            type="button"
            className={`${sharedStyles.btnSmall} ${flagsStyles.retryButton}`}
            onClick={() => {
              void refresh();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {state === 'idle' && error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
        </div>
      )}

      {state === 'loading' && flags.length === 0 && (
        <p className={styles.emptyHint}>Loading flags.</p>
      )}

      {flags.length > 0 && (
        <ul className={flagsStyles.list}>
          {flags.map((flag) => {
            const isPending = pendingKey === flag.key;
            const inputId = `flag-${flag.key}`;
            return (
              <li
                key={flag.key}
                className={`${sharedStyles.surface} ${flagsStyles.card}`}
              >
                <div className={flagsStyles.row}>
                  <div className={flagsStyles.meta}>
                    <label htmlFor={inputId} className={flagsStyles.keyLabel}>
                      {flag.key}
                    </label>
                    {flag.description != null && flag.description !== '' && (
                      <p className={flagsStyles.description}>
                        {flag.description}
                      </p>
                    )}
                    <p className={flagsStyles.footnote}>
                      {flag.value ? 'On' : 'Off'} · updated{' '}
                      {formatRelative(flag.updated_at)}
                      {flag.updated_by_email == null
                        ? ''
                        : ` by ${flag.updated_by_email}`}
                    </p>
                  </div>
                  <label className={flagsStyles.toggle}>
                    <input
                      id={inputId}
                      type="checkbox"
                      role="switch"
                      checked={flag.value}
                      disabled={isPending}
                      onChange={() => {
                        void toggle(flag);
                      }}
                      aria-label={`Toggle ${flag.key}`}
                    />
                    <span className={flagsStyles.toggleTrack} aria-hidden />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
