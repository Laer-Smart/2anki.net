import { useDialog } from '../../lib/hooks/useDialog';
import sharedStyles from '../../styles/shared.module.css';
import fieldStyles from './CardOptionsForm.module.css';

export type CardSizeValue = 'short' | 'medium' | 'detailed';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  value: CardSizeValue;
  onChange: (next: CardSizeValue) => void;
}

const CARD_SIZE_CHOICES: ReadonlyArray<{ label: string; value: CardSizeValue }> = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Detailed', value: 'detailed' },
];

export function CardSizeModal({ isOpen, onClose, value, onChange }: Readonly<Props>) {
  const dialogRef = useDialog(isOpen, onClose);

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="card-size-modal-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <span id="card-size-modal-title" className={sharedStyles.modalHeaderTitle}>
            Card size
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
          <div className={fieldStyles.segmented} role="group" aria-label="Card size">
            {CARD_SIZE_CHOICES.map(({ label, value: choice }) => (
              <button
                key={choice}
                type="button"
                className={`${fieldStyles.segment} ${value === choice ? fieldStyles.segmentActive : ''}`}
                aria-pressed={value === choice}
                onClick={() => onChange(choice)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={fieldStyles.groupIntro}>
            AI conversion uses this to decide how much fits on each card.
          </p>
          <ul className={fieldStyles.bulletList}>
            <li><strong>Short</strong> — 1 fact per card, ~80 characters per answer. Best for vocabulary, dates, formulas.</li>
            <li><strong>Medium</strong> — 1–2 facts per card, ~160 characters per answer. Good default for most notes.</li>
            <li><strong>Detailed</strong> — 3–4 facts per card, ~320 characters per answer. Better for tightly grouped concepts you want to review together.</li>
          </ul>
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
