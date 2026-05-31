import { useCallback, useEffect, useState } from 'react';

import { getShowcase, ShowcaseData } from '../../lib/backend/getShowcase';
import sharedStyles from '../../styles/shared.module.css';
import { CardFrame } from '../PreviewApkgPage/CardFrame';
import styles from './OpsPage.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';
type CurrentStatus = 'loading' | 'loaded' | 'empty';

function formatPopulatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

async function callOpsShowcase(
  method: 'POST' | 'DELETE',
  body?: Record<string, string>
): Promise<{ message: string }> {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(
    method === 'POST' ? '/api/ops/showcase/populate' : '/api/ops/showcase',
    options
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

export default function ShowcaseTab() {
  const [pageId, setPageId] = useState('');
  const [apkgKey, setApkgKey] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [current, setCurrent] = useState<ShowcaseData | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>('loading');
  const [cardIndex, setCardIndex] = useState(0);

  const loadCurrent = useCallback(async () => {
    setCurrentStatus('loading');
    const data = await getShowcase();
    setCurrent(data);
    setCardIndex(0);
    setCurrentStatus(data == null ? 'empty' : 'loaded');
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const handlePopulate = async () => {
    if (pageId.trim().length === 0 || apkgKey.trim().length === 0) return;
    setStatus('loading');
    setMessage('');
    try {
      const result = await callOpsShowcase('POST', {
        pageId: pageId.trim(),
        apkgKey: apkgKey.trim(),
      });
      setStatus('success');
      setMessage(result.message);
      await loadCurrent();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePurge = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const result = await callOpsShowcase('DELETE');
      setStatus('success');
      setMessage(result.message);
      setPageId('');
      setApkgKey('');
      await loadCurrent();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <>
      <p className={styles.panelTitle}>Homepage showcase</p>
      <p className={styles.panelSubtitle}>
        Populate the &ldquo;See it in action&rdquo; section on the homepage with
        a real Notion page and its converted Anki cards.
      </p>

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Current showcase</h2>
        {currentStatus === 'loading' && (
          <p className={styles.emptyHint}>Reading the current showcase</p>
        )}
        {currentStatus === 'empty' && (
          <p className={styles.emptyHint}>
            No showcase configured. Populate one below to show it on the
            homepage.
          </p>
        )}
        {currentStatus === 'loaded' && current && (
          <div className={styles.showcaseCurrent}>
            <p className={styles.showcaseCurrentTitle}>{current.pageTitle}</p>
            <div className={styles.showcaseStats}>
              <div className={styles.showcaseStat}>
                <span className={styles.cardValue}>
                  {current.notionBlocks.length}
                </span>
                <span className={styles.controlsLabel}>Notion blocks</span>
              </div>
              <div className={styles.showcaseStat}>
                <span className={styles.cardValue}>
                  {current.ankiCards.length}
                </span>
                <span className={styles.controlsLabel}>Anki cards</span>
              </div>
            </div>
            <p className={styles.cardFootnote}>
              Populated {formatPopulatedAt(current.populatedAt)}
            </p>
            {current.ankiCards[cardIndex] && (
              <CardFrame card={current.ankiCards[cardIndex]} />
            )}
            {current.ankiCards.length > 1 && (
              <div className={styles.controls}>
                <button
                  type="button"
                  className={sharedStyles.btnSmall}
                  onClick={() => setCardIndex((i) => i - 1)}
                  disabled={cardIndex === 0}
                >
                  Previous card
                </button>
                <span className={styles.controlsLabel}>
                  {cardIndex + 1} / {current.ankiCards.length}
                </span>
                <button
                  type="button"
                  className={sharedStyles.btnSmall}
                  onClick={() => setCardIndex((i) => i + 1)}
                  disabled={cardIndex === current.ankiCards.length - 1}
                >
                  Next card
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Populate</h2>
        <label className={styles.controlsLabel} htmlFor="showcase-page-id">
          Notion page ID
        </label>
        <input
          id="showcase-page-id"
          className={styles.textInput}
          type="text"
          placeholder="35e7ab29a11e80968a8cea6c5e7ff2e7"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
        />
        <label className={styles.controlsLabel} htmlFor="showcase-apkg-key">
          APKG download key
        </label>
        <input
          id="showcase-apkg-key"
          className={styles.textInput}
          type="text"
          placeholder="uploads/owner/file.apkg"
          value={apkgKey}
          onChange={(e) => setApkgKey(e.target.value)}
        />
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={handlePopulate}
            disabled={
              status === 'loading' ||
              pageId.trim().length === 0 ||
              apkgKey.trim().length === 0
            }
          >
            {status === 'loading' ? 'Working…' : 'Populate showcase'}
          </button>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={handlePurge}
            disabled={status === 'loading'}
          >
            Purge showcase
          </button>
        </div>
      </section>

      {status === 'success' && message && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {message}
        </div>
      )}
      {status === 'error' && message && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {message}
        </div>
      )}
    </>
  );
}
