import shared from '../../../styles/shared.module.css';
import styles from './ConnectNotion.module.css';

interface Props {
  ready: boolean;
  connectionLink: string;
}

export default function ConnectNotion({ ready, connectionLink }: Readonly<Props>) {
  if (!ready) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h3 className={styles.title}>Connect your Notion workspace</h3>
        <p className={styles.body}>
          Search and convert pages directly. We only read the pages you
          share with 2anki.
        </p>
        <a className={shared.btnPrimary} href={connectionLink}>
          Connect to Notion
        </a>
      </div>
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>
          Or upload a file you exported from Notion.
        </p>
        <a
          className={`${shared.btnSecondary} ${styles.fallbackAction}`}
          href="/upload"
        >
          Upload a file
        </a>
      </div>
    </div>
  );
}
