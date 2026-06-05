import styles from './DocsPage.module.css';

export function WipBanner() {
  return (
    <div className={styles.wipBanner} role="note">
      These docs are being rewritten with help from AI. If something looks
      wrong,{' '}
      <a
        href="https://github.com/2anki/server/issues/new"
        target="_blank"
        rel="noopener noreferrer"
      >
        open an issue
      </a>{' '}
      — we read every one.
    </div>
  );
}
