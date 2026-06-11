import { Helmet } from 'react-helmet-async';
import styles from '../styles/shared.module.css';

function NotFoundPage() {
  return (
    <div className={`${styles.pageNarrow} ${styles.textCenter}`}>
      <Helmet>
        <title>Page not found — 2anki</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.emptyState}>
        <img src="/mascot/Notion 1.png" alt="" className={styles.mascot404} />
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.secondaryText}>
          This page doesn't exist or may have moved.
        </p>
        <p>
          <a href="/" className={`${styles.btnPrimary} ${styles.btnInline}`}>
            Go to homepage
          </a>
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;
