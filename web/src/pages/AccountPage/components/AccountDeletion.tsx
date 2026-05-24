import styles from '../AccountPage.module.css';

export function AccountDeletion() {
  return (
    <div className={styles.dangerSection}>
      <h4 className={styles.dangerTitle}>Delete account</h4>
      <div className={styles.dangerNotice}>
        All your data will be permanently deleted. This cannot be undone.
      </div>
      <a
        href="/delete-account"
        className={styles.dangerButton}
        onClick={(e) => {
          if (!confirm('Delete your account? This cannot be undone.')) {
            e.preventDefault();
          }
        }}
      >
        Delete account
      </a>
    </div>
  );
}
