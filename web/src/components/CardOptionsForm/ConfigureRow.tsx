import sharedStyles from '../../styles/shared.module.css';
import fieldStyles from './CardOptionsForm.module.css';

interface Props {
  label: string;
  summary: string;
  onConfigure: () => void;
  badge?: string;
}

export function ConfigureRow({ label, summary, onConfigure, badge }: Readonly<Props>) {
  return (
    <div className={fieldStyles.configureRow}>
      <div className={fieldStyles.configureText}>
        <span className={fieldStyles.configureLabel}>
          {label}
          {badge && <span className={sharedStyles.checkboxBadge}>{badge}</span>}
        </span>
        <span className={fieldStyles.configureSummary}>{summary}</span>
      </div>
      <button
        type="button"
        className={sharedStyles.btnSecondary}
        onClick={onConfigure}
        aria-label={`Configure ${label}`}
      >
        Configure
      </button>
    </div>
  );
}
