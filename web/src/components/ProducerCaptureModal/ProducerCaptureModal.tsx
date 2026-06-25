import { useEffect, useId, useRef, useState } from 'react';
import { useDialog } from '../../lib/hooks/useDialog';
import { track } from '../../lib/analytics/track';
import sharedStyles from '../../styles/shared.module.css';
import styles from './ProducerCaptureModal.module.css';

export type ProducerSource = 'pricing_page' | 'heavy_uploader_prompt';

const TEAM_SIZES = ['Just me', '2–10', '11–50', 'More than 50'] as const;

const PURPOSE_MAX_LENGTH = 200;

const FORM_TITLE = 'Tell us what you need';
const FORM_LEAD =
  "We're exploring tools for people who make Anki decks for others. There's nothing to buy yet — answer two questions and we'll come to you first if we build it.";
const PURPOSE_LABEL = 'What are you making decks for?';
const PURPOSE_PLACEHOLDER =
  'e.g. MCAT tutoring, a Spanish course I sell, my biology class';
const TEAM_LABEL = 'How many people will use them?';
const SUBMIT_LABEL = 'Join the early-access list';
const THANKS_TITLE = "You're on the list";
const THANKS_BODY =
  "Thanks. There's no teams product yet — we're still deciding whether to build it. If we do, you'll be among the first to try it.";
const DONE_LABEL = 'Done';
const ERR_SUBMIT_FAILED =
  "Couldn't save that — check your connection and try again.";

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
            {submitted ? THANKS_TITLE : FORM_TITLE}
          </span>
          <button
            type="button"
            aria-label="Close"
            className={sharedStyles.modalClose}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <>
            <div className={sharedStyles.modalBody}>
              <p className={styles.lead}>{THANKS_BODY}</p>
            </div>
            <div className={sharedStyles.modalFooter}>
              <button
                type="button"
                className={sharedStyles.btnSecondary}
                onClick={onClose}
              >
                {DONE_LABEL}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={sharedStyles.modalBody}>
              <p className={styles.lead}>{FORM_LEAD}</p>

              <div className={styles.field}>
                <label htmlFor={`${fieldId}-purpose`} className={styles.label}>
                  {PURPOSE_LABEL}
                </label>
                <textarea
                  id={`${fieldId}-purpose`}
                  className={styles.textarea}
                  value={purpose}
                  maxLength={PURPOSE_MAX_LENGTH}
                  rows={3}
                  placeholder={PURPOSE_PLACEHOLDER}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`${fieldId}-team`} className={styles.label}>
                  {TEAM_LABEL}
                </label>
                <select
                  id={`${fieldId}-team`}
                  className={sharedStyles.select}
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {TEAM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {submitFailed && (
                <p className={styles.fieldError} role="alert">
                  {ERR_SUBMIT_FAILED}
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
                  SUBMIT_LABEL
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
