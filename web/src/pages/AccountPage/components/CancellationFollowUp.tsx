import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export const REASON_KEYS: Record<CancellationReason, string> = {
  'I finished what I needed': 'reasons.finished',
  "I don't use it enough": 'reasons.notEnough',
  'Too expensive': 'reasons.tooExpensive',
  'I found an alternative': 'reasons.foundAlternative',
  'Technical issues': 'reasons.technicalIssues',
  Other: 'reasons.other',
};

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
  const { t } = useTranslation('account');
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, comment.trim());
  };

  return (
    <div className={sharedStyles.marginTopLg}>
      <p>{t('cancellationFollowUp.whyDidYouCancel')}</p>
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
            {t(REASON_KEYS[r])}
          </label>
        ))}
      </div>

      {reason === 'Other' && (
        <textarea
          className={styles.reasonComment}
          placeholder={t('cancellationFollowUp.tellMore')}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.textButton} onClick={onSkip}>
          {t('cancellationFollowUp.skip')}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleSubmit}
          disabled={!reason || isSubmitting}
        >
          {isSubmitting
            ? t('cancellationFollowUp.sending')
            : t('cancellationFollowUp.sendFeedback')}
        </button>
      </div>
    </div>
  );
}
