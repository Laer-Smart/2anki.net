import { Link } from 'react-router-dom';
import sharedStyles from '../../../styles/shared.module.css';
import styles from './EmptyDownloadsSection.module.css';

interface Props {
  isEmpty: boolean;
}

export function EmptyDownloadsSection({ isEmpty }: Readonly<Props>) {
  if (!isEmpty) {
    return null;
  }
  return (
    <>
      <div className={sharedStyles.card}>
        <div className={sharedStyles.emptyState}>
          <p className={sharedStyles.sectionTitle}>No decks yet</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0 1.5rem' }}>
            Paste a Notion link or upload a file to make your first deck.
          </p>
          <Link to="/notion" className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}>
            Make a deck
          </Link>
        </div>
      </div>
      <p className={styles.emptyHint}>
        Need help?{' '}
        <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
          Upload a file
        </Link>
      </p>
    </>
  );
}
