import styles from '../styles/shared.module.css';

interface Props {
  label: string;
  defaultValue: boolean;
  description: string | null;
  onChecked: (checked: boolean) => void;
  badge?: string;
}

function LocalCheckbox({
  label,
  defaultValue,
  description = null,
  onChecked,
  badge,
}: Readonly<Props>) {
  const id = `chk-${label}`;
  return (
    <div className={styles.checkboxRow}>
      <div className={styles.checkboxControl}>
        <input
          id={id}
          name={label}
          type="checkbox"
          checked={defaultValue}
          onChange={(event) => onChecked(event.target.checked)}
        />
        <label htmlFor={id} className={styles.checkboxLabel}>
          <strong>{label}</strong>
        </label>
      </div>
      {badge && (
        <div className={styles.checkboxRight}>
          <span className={styles.checkboxBadge}>{badge}</span>
        </div>
      )}
      {description && (
        <p className={styles.checkboxDescription}>{description}</p>
      )}
    </div>
  );
}

export default LocalCheckbox;
