import { useState } from 'react';

import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from './FeedbackWidget.module.css';

type WidgetStatus = 'idle' | 'sending' | 'sent' | 'error';

const EMOJIS = [
  { label: 'Enraged', emoji: '\u{1F621}', value: 1 },
  { label: 'Skeptical', emoji: '\u{1F928}', value: 2 },
  { label: 'Love it', emoji: '\u{1F60D}', value: 5 },
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
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<WidgetStatus>('idle');

  async function handleSubmit() {
    if (selectedRating == null) return;
    setStatus('sending');
    try {
      await get2ankiApi().submitEmojiFeedback(
        selectedRating,
        page,
        comment || undefined,
        email || undefined
      );
      setStatus('sent');
      onSubmitted?.();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={compact ? styles.inlineThank : styles.thankYou}
      >
        Thanks — feedback received.
      </div>
    );
  }

  return (
    <div className={compact ? styles.widgetCompact : styles.widget}>
      {!compact && <p className={styles.prompt}>How's your experience?</p>}
      <div className={styles.emojiRow}>
        {EMOJIS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            className={`${styles.emojiButton} ${selectedRating === item.value ? styles.emojiSelected : ''}`}
            onClick={() => setSelectedRating(item.value)}
          >
            {item.emoji}
          </button>
        ))}
      </div>
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
          <input
            type="email"
            className={styles.emailInput}
            placeholder="Email (optional)"
            aria-label="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            autoComplete="email"
            data-hj-suppress
          />
          <p className={styles.emailHint}>
            Only used to follow up on this feedback.
          </p>
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
      <div role="status" aria-live="polite">
        {status === 'error' && (
          <p className={styles.errorText}>Something went wrong. Try again?</p>
        )}
      </div>
    </div>
  );
}
