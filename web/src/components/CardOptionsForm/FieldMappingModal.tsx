import type { FieldMapping } from '../../lib/cardFields/types';
import { useDialog } from '../../lib/hooks/useDialog';
import sharedStyles from '../../styles/shared.module.css';
import { FieldMappingPanel } from './FieldMappingPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mapping: FieldMapping;
  onChange: (updated: FieldMapping) => void;
}

export function FieldMappingModal({ isOpen, onClose, mapping, onChange }: Readonly<Props>) {
  const dialogRef = useDialog(isOpen, onClose);

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="field-mapping-modal-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <span id="field-mapping-modal-title" className={sharedStyles.modalHeaderTitle}>
            Field mapping
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
          <FieldMappingPanel mapping={mapping} onChange={onChange} />
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
