import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../../lib/hooks/useDialog';
import { track } from '../../lib/analytics/track';
import sharedStyles from '../../styles/shared.module.css';
import styles from './ProducerCaptureModal.module.css';

export type ProducerSource = 'pricing_page' | 'heavy_uploader_prompt';

const TEAM_SIZES = [
  { value: 'Just me', labelKey: 'modals.producer.teamJustMe' },
  { value: '2–10', labelKey: 'modals.producer.team2to10' },
  { value: '11–50', labelKey: 'modals.producer.team11to50' },
  { value: 'More than 50', labelKey: 'modals.producer.teamMoreThan50' },
] as const;

const PURPOSE_MAX_LENGTH = 200;

interface Props {
  isOpen: boolean;
  source: ProducerSource;
  onClose: () => void;
  onSubmit?: () => Promise<void>;
}

export function ProducerCaptureModal({
  isOpen,
  source,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [purpose, setPurpose] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const capturedRef = useRef(false);

  const dialogRef = useDialog(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setPurpose('');
    setTeamSize('');
    setSubmitting(false);
    setSubmitFailed(false);
    setSubmitted(false);
    capturedRef.current = false;
  }, [isOpen]);

  const trimmedPurpose = purpose.trim();
  const isValid = trimmedPurpose !== '' && teamSize !== '';

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitFailed(false);
    try {
      if (!capturedRef.current) {
        track('producer_intent_captured', {
          source,
          team_size: teamSize,
          purpose: trimmedPurpose,
        });
        capturedRef.current = true;
      }
      await onSubmit?.();
      setSubmitted(true);
    } catch {
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby={`${fieldId}-title`}
    >
      <div className={sharedStyles.modalCardNarrow}>
        <div className={sharedStyles.modalHeader}>
          <span
            id={`${fieldId}-title`}
            className={sharedStyles.modalHeaderTitle}
          >
            {submitted
              ? t('modals.producer.thanksTitle')
              : t('modals.producer.title')}
          </span>
          <button
            type="button"
            aria-label={t('modals.producer.close')}
            className={sharedStyles.modalClose}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <>
            <div className={sharedStyles.modalBody}>
              <p className={styles.lead}>{t('modals.producer.thanksBody')}</p>
            </div>
            <div className={sharedStyles.modalFooter}>
              <button
                type="button"
                className={sharedStyles.btnSecondary}
                onClick={onClose}
              >
                {t('modals.producer.done')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={sharedStyles.modalBody}>
              <p className={styles.lead}>{t('modals.producer.lead')}</p>

              <div className={styles.field}>
                <label htmlFor={`${fieldId}-purpose`} className={styles.label}>
                  {t('modals.producer.purposeLabel')}
                </label>
                <textarea
                  id={`${fieldId}-purpose`}
                  className={styles.textarea}
                  value={purpose}
                  maxLength={PURPOSE_MAX_LENGTH}
                  rows={3}
                  placeholder={t('modals.producer.purposePlaceholder')}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`${fieldId}-team`} className={styles.label}>
                  {t('modals.producer.teamLabel')}
                </label>
                <select
                  id={`${fieldId}-team`}
                  className={sharedStyles.select}
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                >
                  <option value="" disabled>
                    {t('modals.producer.chooseOne')}
                  </option>
                  {TEAM_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {t(size.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {submitFailed && (
                <p className={styles.fieldError} role="alert">
                  {t('modals.producer.errSubmit')}
                </p>
              )}
            </div>
            <div className={sharedStyles.modalFooter}>
              <button
                type="button"
                className={sharedStyles.btnPrimary}
                onClick={handleSubmit}
                disabled={!isValid || submitting}
              >
                {submitting ? (
                  <span className={sharedStyles.spinnerSmall} aria-hidden />
                ) : (
                  t('modals.producer.submit')
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
