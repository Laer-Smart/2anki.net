import { useEffect, useRef, useState } from 'react';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from './PostLoginSurvey.module.css';

type Stage = 'form' | 'sending' | 'sent' | 'error';

const MARKER_KEY = '2anki_post_login';
const SHOW_DELAY_MS = 5000;
const SENT_DISMISS_MS = 2500;

const RATINGS = [
  { value: 1, emoji: '😡', label: 'Enraged' },
  { value: 2, emoji: '🤔', label: 'Skeptical' },
  { value: 5, emoji: '😍', label: 'Love it' },
];

const SUBJECTS = [
  'Medicine',
  'Languages',
  'Law',
  'Computer science',
  'Science',
  'Other',
];

function readMarker(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(MARKER_KEY) != null;
  } catch {
    return false;
  }
}

function consumeMarker(): void {
  try {
    globalThis.sessionStorage?.removeItem(MARKER_KEY);
  } catch {
    // sessionStorage may be unavailable.
  }
}

export default function PostLoginSurvey() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [rating, setRating] = useState<number | null>(null);
  const [improvement, setImprovement] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [otherSubject, setOtherSubject] = useState('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!readMarker()) {
      return;
    }
    consumeMarker();
    let cancelled = false;
    const showTimer = setTimeout(() => {
      get2ankiApi()
        .getPostLoginSurveyStatus()
        .then((result) => {
          if (!cancelled && result.shouldShow) {
            setOpen(true);
          }
        })
        .catch(() => {
          // Stay hidden on failure.
        });
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      if (dismissTimerRef.current != null) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const close = () => {
    setOpen(false);
  };

  const dismiss = () => {
    get2ankiApi()
      .submitPostLoginSurvey('dismissed')
      .catch(() => {
        // Best-effort; close regardless.
      });
    close();
  };

  const buildStudying = (): string | undefined => {
    if (subject == null) {
      return undefined;
    }
    if (subject === 'Other') {
      const trimmed = otherSubject.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return subject;
  };

  const send = async () => {
    setStage('sending');
    const trimmedImprovement = improvement.trim();
    try {
      await get2ankiApi().submitPostLoginSurvey(
        'answered',
        trimmedImprovement.length > 0 ? trimmedImprovement : undefined,
        buildStudying()
      );
      setStage('sent');
      dismissTimerRef.current = setTimeout(close, SENT_DISMISS_MS);
    } catch {
      setStage('error');
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  });

  if (!open) {
    return null;
  }

  return (
    <aside className={styles.card} aria-label="Quick survey">
      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        onClick={dismiss}
      >
        ×
      </button>

      {stage === 'sent' && (
        <p className={styles.confirmation}>
          Thanks — this shapes what we build next.
        </p>
      )}

      {stage !== 'sent' && (
        <>
          <h2 className={styles.title}>Two quick questions</h2>
          <p className={styles.subtitle}>
            We&apos;re working to make 2anki better and want your read on it.
            Skip anything you&apos;d rather not answer.
          </p>

          <div className={styles.question}>
            <p className={styles.label}>How&apos;s 2anki working for you?</p>
            <div className={styles.ratings}>
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={styles.rating}
                  aria-label={r.label}
                  aria-pressed={rating === r.value}
                  onClick={() => setRating(r.value)}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
            {rating != null && (
              <textarea
                className={styles.textarea}
                placeholder="What should we improve? (optional)"
                maxLength={2000}
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
              />
            )}
          </div>

          <div className={styles.question}>
            <p className={styles.label}>What are you studying?</p>
            <div className={styles.chips}>
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.chip}
                  aria-pressed={subject === s}
                  onClick={() => setSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {subject === 'Other' && (
              <input
                type="text"
                className={styles.otherInput}
                placeholder="Tell us what"
                maxLength={2000}
                value={otherSubject}
                onChange={(e) => setOtherSubject(e.target.value)}
              />
            )}
          </div>

          {stage === 'error' && (
            <p className={styles.errorText}>
              Couldn&apos;t save that. Try again.
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.notNow} onClick={dismiss}>
              Not now
            </button>
            <button
              type="button"
              className={styles.send}
              disabled={stage === 'sending'}
              onClick={send}
            >
              Send
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
