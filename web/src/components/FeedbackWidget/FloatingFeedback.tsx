import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import { FeedbackWidget } from './FeedbackWidget';
import styles from './FloatingFeedback.module.css';

const HIDDEN_PATHS = new Set([
  '/whats-new',
  '/feedback',
  '/downloads',
  '/login',
  '/register',
  '/forgot',
]);
const HIDDEN_PREFIXES = ['/rules/', '/users/r/', '/ops'];
const SUPPRESSED_UNTIL_KEY = '2anki_feedback_suppressed_until';
const SUPPRESSION_MS = 14 * 24 * 60 * 60 * 1000;

function shouldHide(pathname: string): boolean {
  if (HIDDEN_PATHS.has(pathname)) return true;
  return HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
}

function isSuppressed(): boolean {
  try {
    const raw = localStorage.getItem(SUPPRESSED_UNTIL_KEY);
    if (raw == null) return false;
    const until = Number.parseInt(raw, 10);
    if (!Number.isFinite(until)) return false;
    return until > Date.now();
  } catch {
    return false;
  }
}

function suppressForWindow(): void {
  try {
    const until = Date.now() + SUPPRESSION_MS;
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(until));
  } catch {
    // localStorage may be disabled (private mode, quota). Best-effort only.
  }
}

export function FloatingFeedback() {
  const { pathname } = useLocation();
  const [suppressed, setSuppressed] = useState(() => isSuppressed());

  if (suppressed) return null;
  if (shouldHide(pathname)) return null;

  const handleResolved = () => {
    suppressForWindow();
    setSuppressed(true);
  };

  return createPortal(
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.panelTitle}>How&apos;s your experience?</p>
          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleResolved}
            aria-label="Dismiss feedback widget"
          >
            ×
          </button>
        </div>
        <FeedbackWidget page={pathname} compact onSubmitted={handleResolved} />
      </div>
    </div>,
    document.body
  );
}
