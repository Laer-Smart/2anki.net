import { Link } from 'react-router-dom';
import styles from '../LimitPage/LimitPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface MindmapLimitModalProps {
  onClose: () => void;
}

export function MindmapLimitModal({ onClose }: Readonly<MindmapLimitModalProps>) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>You've used all 3 maps this month</h1>
        <p className={styles.subheading}>
          Free accounts can have 3 mind maps at a time. Upgrade for unlimited
          mind maps.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link
          to="/pricing"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 'var(--font-semibold)',
            textDecoration: 'none',
          }}
        >
          Upgrade
        </Link>
        <button type="button" onClick={onClose} className={sharedStyles.btnSecondary}>
          Not now
        </button>
      </div>
    </div>
  );
}
