import React, { useEffect, useRef, useState } from 'react';
import {
  CANCELLATION_REASONS,
  CancellationReason,
} from './CancellationFollowUp';
import { PauseCard } from './PauseCard';
import { PauseMonths } from '../../../lib/backend/pauseSubscription';
import { track } from '../../../lib/analytics/track';
import styles from '../AccountPage.module.css';

export const LIFECYCLE_REASONS: readonly CancellationReason[] = [
  'I finished what I needed',
  "I don't use it enough",
];

const isLifecycleReason = (reason: CancellationReason | ''): boolean =>
  LIFECYCLE_REASONS.includes(reason as CancellationReason);

interface CancelFlowProps {
  readonly planLabel: string | null;
  readonly tenureDays: number;
  readonly pauseEligible: boolean;
  readonly isCancelling: boolean;
  readonly isPausing: boolean;
  readonly pauseError: string;
  readonly onCancel: (reason: CancellationReason | '') => void;
  readonly onKeep: (reason: CancellationReason | '') => void;
  readonly onPause: (months: PauseMonths, reason: CancellationReason) => void;
}

export function CancelFlow({
  planLabel,
  tenureDays,
  pauseEligible,
  isCancelling,
  isPausing,
  pauseError,
  onCancel,
  onKeep,
  onPause,
}: CancelFlowProps) {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const offeredReasons = useRef<Set<CancellationReason>>(new Set());

  const showPause = pauseEligible && isLifecycleReason(reason);

  useEffect(() => {
    if (
      showPause &&
      reason !== '' &&
      !offeredReasons.current.has(reason as CancellationReason)
    ) {
      offeredReasons.current.add(reason as CancellationReason);
      track('subscription_pause_offered', {
        reason,
        tenure_days: tenureDays,
      });
    }
  }, [showPause, reason, tenureDays]);

  const handlePause = (months: PauseMonths) => {
    if (reason === '') return;
    track('subscription_paused', {
      pause_months: months,
      reason,
      tenure_days: tenureDays,
    });
    onPause(months, reason);
  };

  return (
    <div className={styles.dangerSection} role="group" aria-label="Cancel">
      <p className={styles.dangerTitle}>Why are you cancelling? (optional)</p>
      <div className={styles.reasonList}>
        {CANCELLATION_REASONS.map((r) => (
          <label key={r} className={styles.reasonOption}>
            <input
              type="radio"
              name="cancel-flow-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {r}
          </label>
        ))}
      </div>

      {showPause && (
        <PauseCard
          planLabel={planLabel}
          isPausing={isPausing}
          pauseError={pauseError}
          onPause={handlePause}
        />
      )}

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onCancel(reason)}
          disabled={isCancelling}
        >
          {isCancelling ? 'Processing…' : 'Cancel subscription'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onKeep(reason)}
          disabled={isCancelling}
        >
          Keep subscription
        </button>
      </div>
    </div>
  );
}
