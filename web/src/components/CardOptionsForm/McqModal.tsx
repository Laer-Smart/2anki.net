import { Link } from 'react-router-dom';
import { useDialog } from '../../lib/hooks/useDialog';
import sharedStyles from '../../styles/shared.module.css';
import fieldStyles from './CardOptionsForm.module.css';

export const MCQ_TTS_LANGUAGE_OPTIONS = [
  { label: "Don't speak", value: '' },
  { label: 'English (US)', value: 'en_US' },
  { label: 'Spanish (Spain)', value: 'es_ES' },
  { label: 'French (France)', value: 'fr_FR' },
  { label: 'German', value: 'de_DE' },
  { label: 'Japanese', value: 'ja_JP' },
  { label: 'Mandarin (Simplified)', value: 'zh_CN' },
  { label: 'Portuguese (Brazil)', value: 'pt_BR' },
] as const;

export type McqTtsKey =
  | 'mcq-tts-question'
  | 'mcq-tts-correct-answer'
  | 'mcq-tts-extra';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  ttsQuestion: string;
  ttsCorrectAnswer: string;
  ttsExtra: string;
  onTtsChange: (key: McqTtsKey, value: string) => void;
}

const ENABLED_CHOICES: ReadonlyArray<{ label: string; value: boolean }> = [
  { label: 'Off', value: false },
  { label: 'On', value: true },
];

export function McqModal({
  isOpen,
  onClose,
  enabled,
  onEnabledChange,
  ttsQuestion,
  ttsCorrectAnswer,
  ttsExtra,
  onTtsChange,
}: Readonly<Props>) {
  const dialogRef = useDialog(isOpen, onClose);

  const ttsFields: ReadonlyArray<{ label: string; key: McqTtsKey; value: string }> = [
    { label: 'Question', key: 'mcq-tts-question', value: ttsQuestion },
    { label: 'Correct answer', key: 'mcq-tts-correct-answer', value: ttsCorrectAnswer },
    { label: 'Extra', key: 'mcq-tts-extra', value: ttsExtra },
  ];

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="mcq-modal-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <span id="mcq-modal-title" className={sharedStyles.modalHeaderTitle}>
            Multiple choice questions
          </span>
          <button
            type="button"
            className={sharedStyles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className={sharedStyles.modalBody}>
          <fieldset
            className={fieldStyles.segmented}
            aria-label="Enable multiple choice questions"
          >
            {ENABLED_CHOICES.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                className={`${fieldStyles.segment} ${enabled === value ? fieldStyles.segmentActive : ''}`}
                onClick={() => onEnabledChange(value)}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <p className={fieldStyles.groupIntro}>
            Photo to deck and the AI chat generate multiple-choice questions when this is on. You can also write them yourself — see the{' '}
            <Link to="/documentation/cards/mcq" className={fieldStyles.groupIntroLink}>
              docs
            </Link>
            .
          </p>

          {enabled && (
            <div className={fieldStyles.section}>
              <p className={fieldStyles.sectionLabel}>Read aloud</p>
              <p className={fieldStyles.sectionHint}>
                Pick a voice for each field. Anki will speak it on the card.
              </p>

              {ttsFields.map(({ label, key, value }) => (
                <div key={key} className={fieldStyles.section}>
                  <div className={fieldStyles.labelRow}>
                    <label htmlFor={key} className={fieldStyles.sectionLabel}>{label}</label>
                  </div>
                  <select
                    id={key}
                    className={fieldStyles.deckInput}
                    value={value}
                    onChange={(e) => onTtsChange(key, e.target.value)}
                  >
                    {MCQ_TTS_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}

              <p className={fieldStyles.sectionHint}>
                If your Anki device has no installed voice for the picked language, the audio stays silent.
              </p>
              <p className={fieldStyles.sectionHint}>
                Missing a language? Email{' '}
                <a href="mailto:support@2anki.net">support@2anki.net</a>{' '}
                and we&apos;ll add it.
              </p>
            </div>
          )}
        </div>
        <div className={sharedStyles.modalFooter}>
          <button type="button" className={sharedStyles.btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
