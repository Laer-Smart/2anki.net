import { DeleteButton } from './ListJobs/DeleteButton';
import { getDownloadFileName } from '../helpers/getDownloadFileName';
import styles from './UploadObjectEntry.module.css';

interface Props {
  title: string;
  url: string;
  deleteUpload: () => void;
}

export default function UploadObjectEntry({
  title,
  url,
  deleteUpload,
}: Readonly<Props>) {
  return (
    <div className={styles.entry}>
      <div className={styles.objectMeta}>
        <DeleteButton onDelete={deleteUpload} />
        <div />
        <span
          className={styles.uploadTitle}
          data-hj-suppress
          dangerouslySetInnerHTML={{ __html: title }}
        />
      </div>
      <div className={styles.objectActions}>
        <a
          download={getDownloadFileName(title)}
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <img
            className={styles.objectIconAction}
            alt="Page action"
            width="32"
            src="/icons/Anki_app_logo.png"
          />
        </a>
      </div>
    </div>
  );
}
