import sharedStyles from '../../styles/shared.module.css';
import fieldStyles from './CardOptionsForm.module.css';
import SettingsIcon from '../icons/SettingsIcon';
import { FieldHint } from '../FieldHint';

interface Props {
  label: string;
  summary: string;
  onConfigure: () => void;
  badge?: string;
  hint?: string;
}

export function ConfigureRow({
  label,
  summary,
  onConfigure,
  badge,
  hint,
}: Readonly<Props>) {
  return (
    <div className={fieldStyles.configureRow}>
      <div className={fieldStyles.configureText}>
        <span className={fieldStyles.configureLabel}>
          {label}
          {badge && <span className={sharedStyles.checkboxBadge}>{badge}</span>}
          {hint && <FieldHint text={hint} />}
        </span>
        <span className={fieldStyles.configureSummary}>{summary}</span>
      </div>
      <button
        type="button"
        className={fieldStyles.configureButton}
        onClick={onConfigure}
        aria-label={`Configure ${label}`}
      >
        <SettingsIcon />
      </button>
    </div>
  );
}
