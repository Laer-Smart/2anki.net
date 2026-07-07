import React, { useState } from 'react';
import styles from '../AccountPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';
import { PauseMonths } from '../../../lib/backend/pauseSubscription';

const PAUSE_LENGTHS: PauseMonths[] = [1, 2, 3];

const addMonths = (from: Date, months: number): Date => {
  const next = new Date(from.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

interface PauseCardProps {
  readonly planLabel: string | null;
  readonly isPausing: boolean;
  readonly pauseError: string;
  readonly onPause: (months: PauseMonths) => void;
}

export function PauseCard({
  planLabel,
  isPausing,
  pauseError,
  onPause,
}: PauseCardProps) {
  const [months, setMonths] = useState<PauseMonths | null>(null);

  const resumeDate = months == null ? null : addMonths(new Date(), months);
  const planText = planLabel ?? 'your plan';

  return (
    <div className={`${styles.section} ${sharedStyles.marginTopLg}`}>
      <p className={styles.dangerTitle}>
        Pause instead — no charge while you're away
      </p>
      <p className={styles.dangerNotice}>
        Taking a break between terms? Pause your subscription instead of
        cancelling. You won't be charged while it's paused, and it resumes on
        its own when you're ready. Everything you've made is saved.
      </p>

      <p className={styles.dangerTitle}>Pause for</p>
      <div className={styles.buttonRow}>
        {PAUSE_LENGTHS.map((length) => (
          <button
            key={length}
            type="button"
            className={
              months === length
                ? `${styles.secondaryButton} ${styles.secondaryButtonActive}`
                : styles.secondaryButton
            }
            aria-pressed={months === length}
            onClick={() => setMonths(length)}
          >
            {length === 1 ? '1 month' : `${length} months`}
          </button>
        ))}
      </div>

      {resumeDate && (
        <p className={styles.planDetail}>
          Resumes {formatDate(resumeDate)} at {planText}. Cancel anytime before
          then.
        </p>
      )}

      <div className={sharedStyles.marginTopLg}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={months == null || isPausing}
          onClick={() => months != null && onPause(months)}
        >
          {isPausing ? 'Pausing…' : 'Pause subscription'}
        </button>
      </div>

      {pauseError && <p className={styles.helpDanger}>{pauseError}</p>}
    </div>
  );
}
