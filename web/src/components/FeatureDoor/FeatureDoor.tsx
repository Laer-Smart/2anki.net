import { useState } from 'react';

import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from './FeatureDoor.module.css';

const COMMENT_MAX = 280;

type Stage =
  | { kind: 'prompt' }
  | { kind: 'recording' }
  | { kind: 'recorded' }
  | { kind: 'sending-comment' }
  | { kind: 'comment-sent' }
  | { kind: 'error'; retry: () => void };

interface FeatureDoorProps {
  featureKey: string;
  title: string;
  question?: string;
}

export function FeatureDoor({
  featureKey,
  title,
  question = 'Would you use this?',
}: FeatureDoorProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'prompt' });
  const [comment, setComment] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const recordInterest = async () => {
    setStage({ kind: 'recording' });
    try {
      await get2ankiApi().recordFeatureInterest(featureKey);
      setStage({ kind: 'recorded' });
    } catch {
      setStage({ kind: 'error', retry: recordInterest });
    }
  };

  const sendComment = async () => {
    const trimmed = comment.trim();
    if (trimmed.length === 0) {
      setStage({ kind: 'comment-sent' });
      return;
    }
    setStage({ kind: 'sending-comment' });
    try {
      await get2ankiApi().recordFeatureInterest(
        featureKey,
        trimmed.slice(0, COMMENT_MAX)
      );
      setStage({ kind: 'comment-sent' });
    } catch {
      setStage({ kind: 'error', retry: sendComment });
    }
  };

  const confirmed =
    stage.kind === 'recorded' ||
    stage.kind === 'sending-comment' ||
    stage.kind === 'comment-sent';

  return (
    <aside className={styles.card} aria-label={`Interest in ${title}`}>
      <button
        type="button"
        className={styles.close}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ×
      </button>

      <p className={styles.title}>{title}</p>

      {stage.kind === 'prompt' && (
        <>
          <p className={styles.question}>{question}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={recordInterest}
            >
              I&apos;d use this
            </button>
          </div>
        </>
      )}

      {stage.kind === 'recording' && (
        <p className={styles.status}>Recording your interest</p>
      )}

      {confirmed && (
        <>
          <p className={styles.status}>
            Noted — we&apos;ll tell you if we build it.
          </p>
          {stage.kind === 'comment-sent' ? (
            <p className={styles.status}>Thanks — added to the note.</p>
          ) : (
            <>
              <label className={styles.question} htmlFor="feature-door-comment">
                What would make it useful?
              </label>
              <input
                id="feature-door-comment"
                type="text"
                className={styles.input}
                placeholder="One line is plenty."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={COMMENT_MAX}
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={sendComment}
                  disabled={stage.kind === 'sending-comment'}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </>
      )}

      {stage.kind === 'error' && (
        <>
          <p className={styles.status}>Couldn&apos;t save that.</p>
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
