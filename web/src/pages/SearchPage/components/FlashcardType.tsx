import { useTranslation } from 'react-i18next';
import styles from '../../../styles/shared.module.css';

interface FlashcardTypeProps {
  active: boolean;
  name: string;
  label?: string;
  isNew?: boolean;
  onSwitch: (name: string) => void;
}

export default function FlashcardType({
  name,
  label,
  onSwitch,
  active,
  isNew = false,
}: Readonly<FlashcardTypeProps>) {
  const { t } = useTranslation('search');
  return (
    <button
      type="button"
      onClick={() => onSwitch(name)}
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
    >
      {label ?? name}
      {isNew ? (
        <span className={styles.chipNewBadge}>{t('flashcardType.new')}</span>
      ) : null}
    </button>
  );
}
