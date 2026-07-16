import { useTranslation } from 'react-i18next';

import styles from './TrustNote.module.css';

interface TrustNoteProps {
  compact?: boolean;
}

export function TrustNote({ compact = false }: Readonly<TrustNoteProps>) {
  const { t } = useTranslation('marketing');
  if (compact) {
    return <p className={styles.note}>{t('trustNote.compact')}</p>;
  }

  return (
    <p className={styles.note}>
      {t('trustNote.fullPrefix')}
      <span className={styles.name}>Alexander Alemayhu</span>
      {t('trustNote.fullSuffix')}
    </p>
  );
}

export default TrustNote;
