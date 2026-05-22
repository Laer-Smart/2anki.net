import { useState } from 'react';
import { Link } from 'react-router-dom';

import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from './FeedbackWidget.module.css';

type WidgetStatus = 'idle' | 'sending' | 'sent' | 'error';

const EMOJIS = [
  { label: 'Enraged', emoji: '\u{1F621}' },
  { label: 'Skeptical', emoji: '\u{1F928}' },
  { label: 'Love it', emoji: '\u{1F60D}' },
] as const;

interface FeedbackWidgetProps {
  page: string;
  onSubmitted?: () => void;
  compact?: boolean;
}

export function FeedbackWidget({
  page,
  onSubmitted,
  compact = false,
}: Readonly<FeedbackWidgetProps>) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<WidgetStatus>('idle');

  async function handleSubmit() {
    if (selectedRating == null) return;
    setStatus('sending');
    try {
      await get2ankiApi().submitEmojiFeedback(
        selectedRating,
        page,
        comment || undefined
      );
      setStatus('sent');
      onSubmitted?.();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className={compact ? styles.inlineThank : styles.thankYou}>
        Thanks — feedback received.
      </div>
    );
  }

  return (
    <div className={compact ? styles.widgetCompact : styles.widget}>
      {!compact && <p className={styles.prompt}>How's your experience?</p>}
      <div className={styles.emojiRow}>
        {EMOJIS.map((item, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              aria-label={item.label}
              className={`${styles.emojiButton} ${selectedRating === rating ? styles.emojiSelected : ''}`}
              onClick={() => setSelectedRating(rating)}
            >
              {item.emoji}
            </button>
          );
        })}
      </div>
      {selectedRating != null && selectedRating <= 2 && (
        <p className={styles.nudge}>
          Want to tell us more?{' '}
          <Link to="/feedback" className={styles.nudgeLink}>
            Share on the feedback page
          </Link>
        </p>
      )}
      {selectedRating != null && (
        <>
          <textarea
            className={styles.commentInput}
            placeholder="Anything else? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={2000}
          />
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending' : 'Send feedback'}
          </button>
        </>
      )}
      {status === 'error' && (
        <p className={styles.errorText}>Something went wrong. Try again?</p>
      )}
    </div>
  );
}
