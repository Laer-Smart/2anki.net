import { useTranslation } from 'react-i18next';
import styles from './ChunkReloadOverlay.module.css';

export function ChunkReloadOverlay() {
  const { t } = useTranslation('errors');
  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      data-testid="chunk-reload-overlay"
    >
      <img
        className={styles.logo}
        src="https://2anki.net/mascot/navbar-logo.png"
        alt=""
      />
      <p className={styles.message}>{t('chunkOverlay.updating')}</p>
    </div>
  );
}
