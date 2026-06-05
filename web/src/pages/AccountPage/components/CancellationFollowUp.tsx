import { useState } from 'react';
import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AccountPage.module.css';

export const CANCELLATION_REASONS = [
  'I finished what I needed',
  "I don't use it enough",
  'Too expensive',
  'I found an alternative',
  'Technical issues',
  'Other',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

interface Props {
  readonly onSubmit: (reason: CancellationReason, comment: string) => void;
  readonly onSkip: () => void;
  readonly isSubmitting: boolean;
}

export function CancellationFollowUp({
  onSubmit,
  onSkip,
  isSubmitting,
}: Props) {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, comment.trim());
  };

  return (
    <div className={sharedStyles.marginTopLg}>
      <p>Why did you cancel? (optional)</p>
      <div className={styles.reasonList}>
        {CANCELLATION_REASONS.map((r) => (
          <label key={r} className={styles.reasonOption}>
            <input
              type="radio"
              name="cancellation-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
            {r}
          </label>
        ))}
      </div>

      {reason === 'Other' && (
        <textarea
          className={styles.reasonComment}
          placeholder="Tell us more (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.textButton} onClick={onSkip}>
          Skip
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleSubmit}
          disabled={!reason || isSubmitting}
        >
          {isSubmitting ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </div>
  );
}
