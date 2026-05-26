import { useDialog } from '../../lib/hooks/useDialog';
import sharedStyles from '../../styles/shared.module.css';
import fieldStyles from './CardOptionsForm.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (next: string) => void;
}

export function UserInstructionsModal({ isOpen, onClose, value, onChange }: Readonly<Props>) {
  const dialogRef = useDialog(isOpen, onClose);

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="user-instructions-modal-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <span id="user-instructions-modal-title" className={sharedStyles.modalHeaderTitle}>
            User instructions
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
          <p className={fieldStyles.sectionHint}>
            Extra guidance sent to the AI when it generates flashcards from a PDF.
          </p>
          <textarea
            className={fieldStyles.instructionsTextarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            placeholder="Instructions for PDF conversion..."
            aria-label="User instructions"
          />
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
