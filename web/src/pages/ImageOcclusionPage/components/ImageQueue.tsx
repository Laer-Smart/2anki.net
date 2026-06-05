import { useRef, useState } from 'react';
import { ImageEntry } from '../types';
import styles from '../ImageOcclusionPage.module.css';
import { Link } from 'react-router-dom';

interface Props {
  entries: ImageEntry[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onHeaderChange: (i: number, header: string) => void;
  isPaying: boolean;
  isNotionConnected: boolean;
  onImportFromNotion: () => void;
}

const FREE_TIER_LIMIT = 3;

export function ImageQueue({
  entries,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
  onHeaderChange,
  isPaying,
  isNotionConnected,
  onImportFromNotion,
}: Readonly<Props>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atLimit = !isPaying && entries.length >= FREE_TIER_LIMIT;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAdd(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!atLimit) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (atLimit) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length > 0) onAdd(files);
  };

  return (
    <div
      className={`${styles.queue} ${isDragOver ? styles.queueDragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.queueList}>
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`${styles.queueItem} ${i === activeIndex ? styles.queueItemActive : ''}`}
          >
            <button
              type="button"
              className={styles.queueThumbBtn}
              onClick={() => !entry.uploading && onSelect(i)}
              disabled={entry.uploading}
              aria-busy={entry.uploading || undefined}
              aria-label={
                entry.uploading
                  ? `Importing ${entry.imageName}`
                  : `Select image ${i + 1}: ${entry.imageName}`
              }
            >
              {entry.uploading ? (
                <div className={styles.queueThumbSkeleton} />
              ) : (
                <img
                  src={entry.previewUrl}
                  alt={entry.imageName}
                  className={styles.queueThumb}
                />
              )}
              {entry.rects.length > 0 && !entry.uploading && (
                <span className={styles.queueBadge}>
                  {entry.rects.length}{' '}
                  {entry.rects.length === 1 ? 'box' : 'boxes'}
                </span>
              )}
            </button>
            <input
              type="text"
              value={entry.header}
              onChange={(e) => onHeaderChange(i, e.target.value)}
              placeholder="Card title — shown above image on every card (optional)"
              className={styles.headerInput}
              aria-label={`Header for image ${i + 1}`}
            />
            <button
              type="button"
              className={styles.queueRemoveBtn}
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove image ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.addBtn}
        onClick={() => !atLimit && fileInputRef.current?.click()}
        disabled={atLimit}
        title={atLimit ? 'Upgrade to add more images' : undefined}
        aria-disabled={atLimit}
      >
        + Upload images
      </button>
      {isNotionConnected && (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => !atLimit && onImportFromNotion()}
          disabled={atLimit}
          title={
            atLimit
              ? 'Upgrade to add more images'
              : 'Pick a page, pick the images'
          }
          aria-disabled={atLimit}
        >
          <img
            src="/icons/Notion_app_logo.png"
            alt=""
            width={14}
            height={14}
            style={{
              verticalAlign: 'middle',
              marginRight: '0.375rem',
              opacity: 0.8,
            }}
          />
          Import from Notion
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {!isPaying && (
        <div className={styles.upgradeNotice}>
          {atLimit ? (
            <>
              <p>You&apos;ve added the 3 images on the free plan.</p>
              <Link to="/pricing" className={styles.upgradeLink}>
                Upgrade to add more
              </Link>
            </>
          ) : (
            <>
              {entries.length} of 3 images on the free plan{' '}
              <Link to="/pricing" className={styles.upgradeLink}>
                Upgrade for unlimited
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
