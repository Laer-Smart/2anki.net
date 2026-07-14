import { useState } from 'react';

import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import styles from './DeckFeedbackPrompt.module.css';

const SUPPRESSED_UNTIL_KEY = '2anki_deck_feedback_suppressed_until';
const SUPPRESSION_MS = 14 * 24 * 60 * 60 * 1000;
const FEEDBACK_PAGE = 'downloads/deck_done';
const POSITIVE_RATING = 5;
const NEGATIVE_RATING = 1;
const COMMENT_MAX = 2000;

type Stage =
  | { kind: 'prompt' }
  | { kind: 'follow-up'; rating: number }
  | { kind: 'sending' }
  | { kind: 'sent'; rating: number }
  | { kind: 'error'; retry: () => void };

function suppressForWindow(): void {
  try {
    const until = Date.now() + SUPPRESSION_MS;
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(until));
  } catch {
    // localStorage may be disabled. Best-effort suppression only.
  }
}

export function isDeckFeedbackSuppressed(): boolean {
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

export function DeckFeedbackPrompt() {
  const [stage, setStage] = useState<Stage>({ kind: 'prompt' });
  const [comment, setComment] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    suppressForWindow();
    setDismissed(true);
  };

  const sendRating = async (rating: number, withComment?: string) => {
    setStage({ kind: 'sending' });
    try {
      await get2ankiApi().submitEmojiFeedback(
        rating,
        FEEDBACK_PAGE,
        withComment != null && withComment.length > 0 ? withComment : undefined
      );
      suppressForWindow();
      setStage({ kind: 'sent', rating });
    } catch {
      setStage({
        kind: 'error',
        retry: () => sendRating(rating, withComment),
      });
    }
  };

  const handlePositive = () => {
    setStage({ kind: 'follow-up', rating: POSITIVE_RATING });
  };

  const handleNegative = () => {
    setStage({ kind: 'follow-up', rating: NEGATIVE_RATING });
  };

  const handleSend = (rating: number) => {
    void sendRating(rating, comment.slice(0, COMMENT_MAX));
  };

  const handleSkip = (rating: number) => {
    void sendRating(rating);
  };

  return (
    <aside className={styles.card} aria-label="Deck feedback">
      <button
        type="button"
        className={styles.close}
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>

      {stage.kind === 'prompt' && (
        <>
          <p className={styles.prompt}>Did this deck come out right?</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={handlePositive}
            >
              Yes, it worked
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={handleNegative}
            >
              Something was off
            </button>
          </div>
        </>
      )}

      {stage.kind === 'follow-up' && (
        <>
          <label className={styles.prompt} htmlFor="deck-feedback-comment">
            {stage.rating === POSITIVE_RATING
              ? 'Glad it came out right. Anything that would make it better?'
              : 'What went wrong?'}
          </label>
          <textarea
            id="deck-feedback-comment"
            className={styles.textarea}
            placeholder={
              stage.rating === POSITIVE_RATING
                ? 'For example: keep my headings, or add a tag to each card.'
                : "For example: images didn't come through, or cards were empty."
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={COMMENT_MAX}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => handleSend(stage.rating)}
            >
              Send
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => handleSkip(stage.rating)}
            >
              Skip
            </button>
          </div>
        </>
      )}

      {stage.kind === 'sending' && <p className={styles.status}>Sending</p>}

      {stage.kind === 'sent' && (
        <p className={styles.status}>Feedback received.</p>
      )}

      {stage.kind === 'error' && (
        <>
          <p className={styles.status}>Couldn&apos;t send that.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={stage.retry}
            >
              Try again
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
