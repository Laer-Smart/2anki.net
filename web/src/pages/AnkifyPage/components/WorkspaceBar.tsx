import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend } from '../../../lib/backend/Backend';
import AnkifyClient from '../../../lib/interfaces/AnkifyClient';
import DotsHorizontal from '../../../components/icons/DotsHorizontal';

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

const formatSessionLabel = (url: string): string => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
};

interface Props {
  readonly backend?: Backend;
  readonly showWorkspaceLink?: boolean;
}

export default function WorkspaceBar({
  backend,
  showWorkspaceLink = false,
}: Props) {
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

  let statusContent: ReactNode;
  if (!containerReady) {
    statusContent = (
      <>
        <span className={styles.workspaceBarDotStarting} aria-hidden="true" />
        <span>Starting…</span>
      </>
    );
  } else if (ankiWebLinked) {
    statusContent = (
      <>
        <span className={styles.workspaceBarDotRunning} aria-hidden="true" />
        <span>Anki running</span>
      </>
    );
  } else {
    statusContent = (
      <>
        <span className={styles.workspaceBarDotWarning} aria-hidden="true" />
        <span>Almost there</span>
      </>
    );
  }

  return (
    <div className={styles.workspaceBar}>
      {showWorkspaceLink && (
        <Link to="/ankify" className={styles.workspaceBarBackLink}>
          ← Workspace
        </Link>
      )}
      <span className={styles.workspaceBarStatus}>{statusContent}</span>
      {sessionUrl != null && (
        <span className={styles.workspaceBarSession} title={sessionUrl}>
          {formatSessionLabel(sessionUrl)}
        </span>
      )}
      <div className={styles.workspaceBarActions}>
        {sessionUrl == null ? (
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            disabled
          >
            Opening…
          </button>
        ) : (
          <a
            href={sessionUrl}
            target="_blank"
            rel="noreferrer"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
          >
            Open Anki
          </a>
        )}
        <div className={styles.workspaceBarMenuWrapper} ref={menuRef}>
          <button
            type="button"
            className={`${sharedStyles.btnIcon} ${styles.workspaceBarMenuButton}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Workspace options"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <DotsHorizontal width={16} height={16} />
          </button>
          {menuOpen && (
            <div role="menu" className={styles.workspaceBarMenu}>
              <button
                type="button"
                role="menuitem"
                className={styles.workspaceBarMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  respin.mutate();
                }}
                disabled={respin.isPending}
              >
                {respin.isPending ? 'Restarting…' : 'Restart'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.workspaceBarMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmShutdown(true);
                }}
              >
                Shut down
              </button>
            </div>
          )}
        </div>
      </div>
      {confirmShutdown && (
        <div
          className={styles.workspaceBarConfirm}
          role="alertdialog"
          aria-modal="true"
        >
          <div className={styles.workspaceBarConfirmCard}>
            <p className={styles.workspaceBarConfirmTitle}>
              Shut your Anki down?
            </p>
            <p className={styles.workspaceBarConfirmBody}>
              Your collection stays safe in AnkiWeb.
            </p>
            <div className={styles.workspaceBarConfirmActions}>
              <button
                type="button"
                className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
                onClick={() => setConfirmShutdown(false)}
                disabled={stop.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
                onClick={() => {
                  stop.mutate(activeClient.id, {
                    onSuccess: () => setConfirmShutdown(false),
                  });
                }}
                disabled={stop.isPending}
              >
                {stop.isPending ? 'Shutting down…' : 'Shut down'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
