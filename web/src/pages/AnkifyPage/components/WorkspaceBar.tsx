import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend } from '../../../lib/backend/Backend';
import AnkifyClient from '../../../lib/interfaces/AnkifyClient';
import ExternalLinkIcon from '../../../components/icons/ExternalLinkIcon';
import PowerIcon from '../../../components/icons/PowerIcon';
import ArrowRightOnRectangleIcon from '../../../components/icons/ArrowRightOnRectangleIcon';
import CloudArrowUpIcon from '../../../components/icons/CloudArrowUpIcon';
import DotsHorizontal from '../../../components/icons/DotsHorizontal';
import { track } from '../../../lib/analytics/track';

const QUERY_KEY = ['ankify-clients'];
const ANKI_WEB_ACK_KEY = 'ankify_anki_web_acknowledged';
const SESSION_URL_PREFIX = 'ankify_session_url:';

const sessionUrlKey = (clientId: number) => `${SESSION_URL_PREFIX}${clientId}`;

const readCachedSessionUrl = (clientId: number): string | null => {
  try {
    return globalThis.localStorage?.getItem(sessionUrlKey(clientId)) ?? null;
  } catch {
    return null;
  }
};

const writeCachedSessionUrl = (clientId: number, url: string | null) => {
  try {
    if (url == null) {
      globalThis.localStorage?.removeItem(sessionUrlKey(clientId));
    } else {
      globalThis.localStorage?.setItem(sessionUrlKey(clientId), url);
    }
  } catch {}
};

interface Props {
  readonly backend?: Backend;
  readonly showWorkspaceLink?: boolean;
  readonly title?: string;
}

export default function WorkspaceBar({
  backend,
  showWorkspaceLink = false,
  title,
}: Props) {
  const { t } = useTranslation('ankify');
  const api = backend ?? get2ankiApi();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery<AnkifyClient[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.listAnkifyClients(),
  });

  const activeClient = (data ?? []).find((c) => c.status === 'active');
  const hasActiveClient = activeClient != null;

  const readiness = useQuery({
    queryKey: ['ankify-active-ready'],
    queryFn: () => api.checkAnkifyActiveClientReady(),
    enabled: hasActiveClient,
    refetchInterval: (query) =>
      (query.state.data as { ready?: boolean } | undefined)?.ready === true
        ? false
        : 2000,
  });

  const ankiWebStatus = useQuery({
    queryKey: ['ankify-anki-web-status'],
    queryFn: () => api.checkAnkifyAnkiWebStatus(),
    enabled: hasActiveClient && readiness.data?.ready === true,
    refetchInterval: (query) =>
      (query.state.data as { status?: string } | undefined)?.status === 'linked'
        ? false
        : 15_000,
  });

  const containerReady = readiness.data?.ready === true;
  const ankiWebLinked = ankiWebStatus.data?.status === 'linked';

  const activeProfile = useQuery({
    queryKey: ['ankify-active-profile'],
    queryFn: () => api.getAnkifyActiveProfile(),
    enabled: hasActiveClient && containerReady,
  });

  const [syncFlash, setSyncFlash] = useState<'done' | 'error' | null>(null);
  const syncFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (syncFlashTimer.current != null) clearTimeout(syncFlashTimer.current);
    },
    []
  );

  const flashSync = (outcome: 'done' | 'error') => {
    setSyncFlash(outcome);
    if (syncFlashTimer.current != null) clearTimeout(syncFlashTimer.current);
    syncFlashTimer.current = setTimeout(() => setSyncFlash(null), 4_000);
  };

  const syncToAnkiWeb = useMutation({
    mutationFn: () => api.syncAnkifyToAnkiWeb(),
    onSuccess: () => {
      flashSync('done');
      queryClient.invalidateQueries({ queryKey: ['ankify-anki-web-status'] });
    },
    onError: () => flashSync('error'),
  });

  const stop = useMutation({
    mutationFn: (id: number) => api.stopAnkifyClient(id),
    onSuccess: (_response, id) => {
      writeCachedSessionUrl(id, null);
      try {
        globalThis.localStorage?.removeItem(ANKI_WEB_ACK_KEY);
      } catch {}
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const respin = useMutation({
    mutationFn: () => api.respinAnkifyClient(),
    onSuccess: (client) => {
      if (client.session_url != null) {
        writeCachedSessionUrl(client.id, client.session_url);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const reissueSession = useMutation({
    mutationFn: (id: number) => api.reissueAnkifySessionUrl(id),
    onSuccess: (client) => {
      if (client.session_url != null) {
        writeCachedSessionUrl(client.id, client.session_url);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
    return undefined;
  }, [menuOpen]);

  const cachedSessionUrl =
    activeClient == null ? null : readCachedSessionUrl(activeClient.id);
  const serverHasActive = activeClient?.has_active_session !== false;
  const sessionUrl =
    activeClient?.session_url ?? (serverHasActive ? cachedSessionUrl : null);

  useEffect(() => {
    if (activeClient == null) return;
    if (activeClient.has_active_session === false && cachedSessionUrl != null) {
      writeCachedSessionUrl(activeClient.id, null);
    }
  }, [activeClient?.id, activeClient?.has_active_session, cachedSessionUrl]);

  useEffect(() => {
    if (activeClient == null) return;
    const params = new URLSearchParams(location.search);
    if (params.get('session_expired') !== '1') return;
    writeCachedSessionUrl(activeClient.id, null);
    params.delete('session_expired');
    params.delete('reason');
    const next = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: next.length > 0 ? `?${next}` : '',
      },
      { replace: true }
    );
  }, [activeClient?.id, location.search, location.pathname, navigate]);

  const reissueMutate = reissueSession.mutate;
  const reissueIsPending = reissueSession.isPending;
  useEffect(() => {
    if (activeClient == null) return;
    if (!containerReady) return;
    if (sessionUrl != null) return;
    if (reissueIsPending) return;
    reissueMutate(activeClient.id);
  }, [
    activeClient?.id,
    containerReady,
    sessionUrl,
    reissueIsPending,
    reissueMutate,
  ]);

  if (activeClient == null) {
    return null;
  }

  let statusDot: ReactNode;
  let statusLabel: string;
  if (!containerReady) {
    statusDot = (
      <span className={styles.workspaceBarDotStarting} aria-hidden="true" />
    );
    statusLabel = t('workspace.starting');
  } else if (ankiWebLinked) {
    statusDot = (
      <span className={styles.workspaceBarDotRunning} aria-hidden="true" />
    );
    statusLabel = t('workspace.running');
  } else {
    statusDot = (
      <span className={styles.workspaceBarDotWarning} aria-hidden="true" />
    );
    statusLabel = t('workspace.almostThere');
  }

  const openControl =
    sessionUrl == null ? (
      <button
        type="button"
        className={`${styles.workspaceBarIconButton} ${styles.workspaceBarIconPrimary}`}
        aria-label={t('workspace.openAnki')}
        title={t('workspace.opening')}
        disabled
      >
        <ExternalLinkIcon width={18} height={18} />
      </button>
    ) : (
      <a
        href={sessionUrl}
        target="_blank"
        rel="noreferrer"
        className={`${styles.workspaceBarIconButton} ${styles.workspaceBarIconPrimary}`}
        aria-label={t('workspace.openAnki')}
        title={sessionUrl}
      >
        <ExternalLinkIcon width={18} height={18} />
      </a>
    );

  const onRestart = () => {
    setMenuOpen(false);
    respin.mutate();
  };

  const onShutDown = () => {
    setMenuOpen(false);
    setConfirmShutdown(true);
  };

  const onSyncToAnkiWeb = () => {
    setMenuOpen(false);
    track('ankify_sync_ankiweb');
    syncToAnkiWeb.mutate();
  };

  const actions = (
    <div className={styles.workspaceBarActions}>
      {openControl}
      <span className={styles.workspaceBarInlineActions}>
        <button
          type="button"
          className={styles.workspaceBarIconButton}
          aria-label={t('workspace.syncToAnkiWeb')}
          title={t('workspace.syncToAnkiWeb')}
          onClick={onSyncToAnkiWeb}
          disabled={syncToAnkiWeb.isPending || !containerReady}
        >
          <CloudArrowUpIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className={styles.workspaceBarIconButton}
          aria-label={t('workspace.restartAnki')}
          title={t('workspace.restartAnki')}
          onClick={onRestart}
          disabled={respin.isPending}
        >
          <PowerIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className={styles.workspaceBarIconButton}
          aria-label={t('workspace.shutDownAnki')}
          title={t('workspace.shutDownAnki')}
          onClick={onShutDown}
        >
          <ArrowRightOnRectangleIcon width={18} height={18} />
        </button>
      </span>
      <div className={styles.workspaceBarMenuWrapper} ref={menuRef}>
        <button
          type="button"
          className={styles.workspaceBarIconButton}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('workspace.moreOptions')}
          title={t('workspace.more')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <DotsHorizontal width={18} height={18} />
        </button>
        {menuOpen && (
          <div role="menu" className={styles.workspaceBarMenu}>
            <button
              type="button"
              role="menuitem"
              className={styles.workspaceBarMenuItem}
              aria-label={t('workspace.syncToAnkiWeb')}
              onClick={onSyncToAnkiWeb}
              disabled={syncToAnkiWeb.isPending || !containerReady}
            >
              {syncToAnkiWeb.isPending
                ? t('workspace.syncing')
                : t('workspace.syncToAnkiWeb')}
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.workspaceBarMenuItem}
              aria-label={t('workspace.restartAnki')}
              onClick={onRestart}
              disabled={respin.isPending}
            >
              {respin.isPending
                ? t('workspace.restarting')
                : t('workspace.restartAnki')}
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.workspaceBarMenuItem}
              aria-label={t('workspace.shutDownAnki')}
              onClick={onShutDown}
            >
              {t('workspace.shutDownAnki')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const confirmCard = confirmShutdown && (
    <div
      className={styles.workspaceBarConfirm}
      role="alertdialog"
      aria-modal="true"
    >
      <div className={styles.workspaceBarConfirmCard}>
        <p className={styles.workspaceBarConfirmTitle}>
          {t('workspace.confirmShutdownTitle')}
        </p>
        <p className={styles.workspaceBarConfirmBody}>
          {t('workspace.confirmShutdownBody')}
        </p>
        <div className={styles.workspaceBarConfirmActions}>
          <button
            type="button"
            className={styles.workspaceBarConfirmCancel}
            onClick={() => setConfirmShutdown(false)}
            disabled={stop.isPending}
          >
            {t('workspace.cancel')}
          </button>
          <button
            type="button"
            className={styles.workspaceBarConfirmDanger}
            onClick={() => {
              stop.mutate(activeClient.id, {
                onSuccess: () => setConfirmShutdown(false),
              });
            }}
            disabled={stop.isPending}
          >
            {stop.isPending
              ? t('workspace.shuttingDown')
              : t('workspace.shutDown')}
          </button>
        </div>
      </div>
    </div>
  );

  const profileName =
    activeProfile.data != null && activeProfile.data.length > 0
      ? activeProfile.data
      : null;

  let syncStatusText: string | null = null;
  if (syncToAnkiWeb.isPending) {
    syncStatusText = t('workspace.syncingStatus');
  } else if (syncFlash === 'done') {
    syncStatusText = t('workspace.syncedStatus');
  } else if (syncFlash === 'error') {
    syncStatusText = t('workspace.syncErrorStatus');
  }

  const status = (
    <span className={styles.workspaceBarStatus}>
      {statusDot}
      <span>{statusLabel}</span>
      {profileName != null && (
        <>
          <span className={styles.workspaceBarStatusSep} aria-hidden="true">
            ·
          </span>
          <span
            className={styles.workspaceBarProfile}
            title={t('workspace.profileTitle', { name: profileName })}
          >
            {t('workspace.profile', { name: profileName })}
          </span>
        </>
      )}
      {sessionUrl != null && (
        <>
          <span className={styles.workspaceBarStatusSep} aria-hidden="true">
            ·
          </span>
          <span className={styles.workspaceBarSession} title={sessionUrl}>
            {t('workspace.sessionActive')}
          </span>
        </>
      )}
      {syncStatusText != null && (
        <>
          <span className={styles.workspaceBarStatusSep} aria-hidden="true">
            ·
          </span>
          <span
            className={
              syncFlash === 'error'
                ? styles.workspaceBarSyncError
                : styles.workspaceBarSync
            }
            aria-live="polite"
          >
            {syncStatusText}
          </span>
        </>
      )}
    </span>
  );

  if (title != null) {
    return (
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceHeaderLeft}>
          <h1 className={styles.workspaceHeaderTitle}>{title}</h1>
          <span className={styles.workspaceHeaderDash} aria-hidden="true">
            —
          </span>
          {status}
        </div>
        {actions}
        {confirmCard}
      </header>
    );
  }

  return (
    <div className={styles.workspaceBar}>
      {showWorkspaceLink && (
        <Link to="/ankify" className={styles.workspaceBarBackLink}>
          {t('workspace.backLink')}
        </Link>
      )}
      {status}
      {actions}
      {confirmCard}
    </div>
  );
}
