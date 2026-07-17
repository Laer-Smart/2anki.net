import { useTranslation } from 'react-i18next';

import styles from '../../../../styles/shared.module.css';

interface Prop {
  onDelete: () => void;
}

export function DeleteButton({ onDelete }: Readonly<Prop>) {
  const { t } = useTranslation('downloadsx');
  return (
    <button
      aria-label={t('delete.ariaLabel')}
      type="button"
      className={styles.btnGhost}
      onClick={() => onDelete()}
    >
      ❌
    </button>
  );
}
