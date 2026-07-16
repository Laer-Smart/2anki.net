import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  question,
}: FeatureDoorProps) {
  const { t } = useTranslation('marketing');
  const questionText = question ?? t('featureDoor.defaultQuestion');
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
    <aside
      className={styles.card}
      aria-label={t('featureDoor.interestAria', { title })}
    >
      <button
        type="button"
        className={styles.close}
        onClick={() => setDismissed(true)}
        aria-label={t('featureDoor.dismiss')}
      >
        ×
      </button>

      <p className={styles.title}>{title}</p>

      {stage.kind === 'prompt' && (
        <>
          <p className={styles.question}>{questionText}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={recordInterest}
            >
              {t('featureDoor.useThis')}
            </button>
          </div>
        </>
      )}

      {stage.kind === 'recording' && (
        <p className={styles.status}>{t('featureDoor.recording')}</p>
      )}

      {confirmed && (
        <>
          <p className={styles.status}>{t('featureDoor.noted')}</p>
          {stage.kind === 'comment-sent' ? (
            <p className={styles.status}>{t('featureDoor.thanksAdded')}</p>
          ) : (
            <>
              <label className={styles.question} htmlFor="feature-door-comment">
                {t('featureDoor.whatUseful')}
              </label>
              <input
                id="feature-door-comment"
                type="text"
                className={styles.input}
                placeholder={t('featureDoor.inputPlaceholder')}
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
                  {t('featureDoor.send')}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {stage.kind === 'error' && (
        <>
          <p className={styles.status}>{t('featureDoor.errorSave')}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={stage.retry}
            >
              {t('featureDoor.tryAgain')}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
