import styles from '../ImportPage.module.css';

interface ImportProgressProps {
  imported: number;
  total: number;
  fileName: string;
  pageTitle: string;
  statusText: string | null;
}

export default function ImportProgress({
  imported,
  total,
  fileName,
  pageTitle,
  statusText,
}: Readonly<ImportProgressProps>) {
  const isUploadingImages = statusText?.startsWith('uploading') ?? false;

  function getPercent() {
    if (isUploadingImages) return 0;
    if (total > 0) return Math.round((imported / total) * 100);
    return 0;
  }
  const percent = getPercent();

  return (
    <div className={styles.progressContainer}>
      <p className={styles.progressTitle}>Importing to Notion</p>
      {fileName && pageTitle && (
        <p className={styles.progressSummary}>
          {fileName} &rarr; {pageTitle}
        </p>
      )}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>
      <p className={styles.progressCount}>
        {isUploadingImages
          ? (statusText ?? '').replace(
              'uploading images ',
              'Uploading images: '
            )
          : `${imported} of ${total} cards`}
      </p>
      <p className={styles.progressReassurance}>
        {isUploadingImages
          ? 'Uploading images to Notion. This can take a minute for large decks.'
          : "You can leave this page — we'll keep going in the background."}
      </p>
    </div>
  );
}
