import { Link } from 'react-router-dom';
import { PreviewSettings } from '../../lib/preview/classifyBlock';
import sharedStyles from '../../styles/shared.module.css';
import styles from './PreviewSettings.module.css';

interface PreviewSettingsRailProps {
  settings: PreviewSettings;
  onChange: (next: PreviewSettings) => void;
  convertHref: string;
}

interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ id, label, checked, onToggle }: Readonly<ToggleRowProps>) {
  return (
    <div className={styles.toggleRow}>
      <label htmlFor={id} className={styles.toggleLabel}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={onToggle}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

export function PreviewSettingsRail({
  settings,
  onChange,
  convertHref,
}: Readonly<PreviewSettingsRailProps>) {
  const patch = (key: keyof PreviewSettings) =>
    onChange({ ...settings, [key]: !settings[key] });

  return (
    <div className={styles.rail}>
      <h2 className={styles.heading}>Card settings</h2>
      <div className={styles.toggleList}>
        <ToggleRow
          id="setting-toggles"
          label="Include toggles as cards"
          checked={settings.includeToggles}
          onToggle={() => patch('includeToggles')}
        />
        <ToggleRow
          id="setting-headings"
          label="Include headings as cards"
          checked={settings.includeHeadings}
          onToggle={() => patch('includeHeadings')}
        />
        <ToggleRow
          id="setting-recurse"
          label="Recurse into sub-pages"
          checked={settings.recurseSubPages}
          onToggle={() => patch('recurseSubPages')}
        />
        <ToggleRow
          id="setting-columns"
          label="Treat columns as cards"
          checked={settings.columnsAsCards}
          onToggle={() => patch('columnsAsCards')}
        />
      </div>
      <Link to={convertHref} className={`${sharedStyles.btnPrimary} ${styles.convertBtn}`}>
        Convert with these settings
      </Link>
    </div>
  );
}
